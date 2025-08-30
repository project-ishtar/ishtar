import { Content, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  Message,
} from '@ishtar/commons/types';
import { db } from '../index';
import admin from 'firebase-admin';
import { chatMessageConverter } from '../converters/message-converter';
import { getUserById } from '../cache/user-cache';
import { getGlobalSettings } from '../cache/global-settings';

let geminiAI: GoogleGenAI;

const functionOptions = {
  secrets: ['GEMINI_API_KEY'],
};

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

function countTokens(
  data: admin.firestore.QuerySnapshot<Message, admin.firestore.DocumentData>,
): number {
  let count = 0;

  data.forEach((item) => {
    if (item.exists) {
      const message = item.data();

      count += message.tokenCount ?? 0;
    }
  });

  return count;
}

function getContentsArray(
  data: admin.firestore.QuerySnapshot<Message, admin.firestore.DocumentData>,
): Content[] {
  const contents: Content[] = [];

  data.forEach((item) => {
    if (item.exists) {
      const message = item.data();

      if (message.role !== 'system') {
        contents.push({
          role: message.role,
          parts: message.contents
            .filter((content) => content.type === 'text')
            .map((content) => ({ text: content.text })),
        });
      }
    }
  });

  return contents;
}

export const callAi = onCall<AiRequest>(
  functionOptions,
  async (request): Promise<AiResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        'unauthenticated',
        'You must be authenticated to call this function.',
      );
    }

    const user = await getUserById(request.auth.uid);
    const globalSettings = getGlobalSettings(user.role);

    const { promptMessageId, conversationId } = request.data;

    const conversationsRef = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('conversations');

    const conversationRef = conversationsRef.doc(conversationId);
    const conversationData = await conversationRef.get();

    if (!conversationData.exists) {
      throw new HttpsError(
        'internal',
        'Something went wrong while creating the conversation.',
      );
    }

    const conversation = conversationData.data() as Conversation;

    const messagesRef = conversationRef
      .collection('messages')
      .withConverter(chatMessageConverter);

    const promptMessageRef = messagesRef.doc(promptMessageId);
    const promptMessage = await promptMessageRef.get();

    if (!promptMessage.exists) {
      throw new HttpsError(
        'permission-denied',
        `Prompt with ID ${promptMessageId} is not found.`,
      );
    }

    const prompt = promptMessage.data() as Message;

    let messagesInOrderDoc: admin.firestore.QuerySnapshot<
      Message,
      admin.firestore.DocumentData
    >;
    const contents: Content[] = [];

    const model =
      conversation?.chatSettings?.model ?? globalSettings.defaultModel;

    if (!model) {
      throw new HttpsError('permission-denied', 'No AI model available.');
    }

    const isChatModel =
      conversation?.chatSettings?.enableMultiTurnConversation ?? false;

    /**
     * If chat token and this count crosses 50,000, summarize.
     */
    let tokenCount = 0;

    if (isChatModel) {
      if (conversation.summarizedMessageId) {
        const summarizedMessageDoc = await messagesRef
          .doc(conversation.summarizedMessageId)
          .get();

        const previousMessagesInOrderSnapshot = await messagesRef
          .orderBy('timestamp', 'desc')
          .orderBy(admin.firestore.FieldPath.documentId())
          .startAfter(summarizedMessageDoc)
          .limit(10)
          .get();

        tokenCount += countTokens(previousMessagesInOrderSnapshot);

        contents.push(
          ...getContentsArray(previousMessagesInOrderSnapshot).reverse(),
        );

        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .orderBy(admin.firestore.FieldPath.documentId())
          .startAt(summarizedMessageDoc)
          .get();

        tokenCount += countTokens(messagesInOrderDoc);

        contents.push(...getContentsArray(messagesInOrderDoc));
      } else {
        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .get();

        tokenCount += countTokens(messagesInOrderDoc);

        contents.push(...getContentsArray(messagesInOrderDoc));
      }
    } else {
      contents.push({
        role: 'user',
        parts: prompt.contents
          .filter((content) => content.type === 'text')
          .map((content) => ({ text: content.text })),
      });
    }

    console.log(`contents length: ${contents.length}`);

    if (!geminiAI) {
      geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    }

    const response = await geminiAI.models.generateContent({
      model,
      contents,
      config: {
        ...chatConfig,
        systemInstruction:
          conversation?.chatSettings?.systemInstruction ?? undefined,
        temperature:
          conversation?.chatSettings?.temperature ?? globalSettings.temperature,
        ...(conversation?.chatSettings?.enableThinking
          ? {
              ...(conversation?.chatSettings?.thinkingCapacity === null
                ? {}
                : {
                    thinkingConfig: {
                      thinkingBudget: conversation.chatSettings
                        .thinkingCapacity as number,
                    },
                  }),
            }
          : {
              thinkingConfig: {
                thinkingBudget: 0,
              },
            }),
      },
    });

    if (!response) {
      throw new HttpsError('internal', 'AI server failed to respond.');
    }

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (response.usageMetadata?.candidatesTokenCount ?? 0) +
      (response.usageMetadata?.thoughtsTokenCount ?? 0);

    console.log(`Usage metadata: ${JSON.stringify(response.usageMetadata)}`);

    const batch = db.batch();

    batch.update(promptMessageRef, {
      tokenCount: inputTokenCount,
    });

    tokenCount += inputTokenCount;

    let totalInputTokenCount =
      (conversation.inputTokenCount ?? 0) + inputTokenCount;
    let totalOutputTokenCount =
      (conversation.outputTokenCount ?? 0) + outputTokenCount;

    batch.update(conversationRef, {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      inputTokenCount: totalInputTokenCount,
      outputTokenCount: totalOutputTokenCount,
    });

    const newModelMessageRef = messagesRef.doc();

    batch.set(newModelMessageRef, {
      role: 'model',
      contents: [{ type: 'text', text: response.text ?? '' }],
      timestamp: new Date(),
      tokenCount: outputTokenCount,
      isSummary: false,
    } as Message);

    tokenCount += outputTokenCount;

    await batch.commit();

    if (!response.text) {
      console.log('Response not generated by AI.');
      console.log(JSON.stringify(response));

      if (response.promptFeedback?.blockReason) {
        throw new HttpsError(
          'permission-denied',
          response.promptFeedback.blockReasonMessage ??
            'AI refused to generate a response.',
        );
      }

      throw new HttpsError(
        'permission-denied',
        'The AI model failed to generate a response. Please try again.',
      );
    }

    let summaryInputTokenCount = 0;
    let summaryOutputTokenCount = 0;

    console.log(`token count: ${tokenCount}`);

    if (isChatModel && tokenCount >= 75000) {
      try {
        const summaryResponse = await generateSummary({
          messagesInOrderDoc: messagesInOrderDoc!,
          messagesRef,
          systemInstruction: conversation?.chatSettings?.systemInstruction,
          responseFromModel: response.text,
        });

        if (summaryResponse) {
          const { summarizedMessageId, inputTokenCount, outputTokenCount } =
            summaryResponse;

          summaryInputTokenCount = inputTokenCount;
          summaryOutputTokenCount = outputTokenCount;

          totalInputTokenCount += inputTokenCount;
          totalOutputTokenCount += outputTokenCount;

          const convoRef = conversationsRef.doc(conversationId);
          const convo = await convoRef.get();

          if (convo.exists) {
            await convoRef.update({
              summarizedMessageId: summarizedMessageId,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              inputTokenCount: totalInputTokenCount,
              outputTokenCount: totalOutputTokenCount,
            });
          }
        }
      } catch (error) {
        console.warn('Summarization failed.');
        console.warn(error);
      }
    }

    JSON.stringify(`model used: ${JSON.stringify(response.modelVersion)}`);
    JSON.stringify(
      `prompt feedback: ${JSON.stringify(response.promptFeedback)}`,
    );

    return {
      responseId: newModelMessageRef.id,
      response: response.text,
      conversationId,
      inputTokenCount: inputTokenCount + summaryInputTokenCount,
      outputTokenCount: outputTokenCount + summaryOutputTokenCount,
    };
  },
);

async function generateSummary({
  messagesInOrderDoc,
  responseFromModel,
  systemInstruction,
  messagesRef,
}: {
  messagesInOrderDoc: admin.firestore.QuerySnapshot<
    Message,
    admin.firestore.DocumentData
  >;
  messagesRef: admin.firestore.CollectionReference<
    Message,
    admin.firestore.DocumentData
  >;
  responseFromModel: string;
  systemInstruction?: string | null;
}): Promise<{
  summarizedMessageId: string;
  inputTokenCount: number;
  outputTokenCount: number;
} | null> {
  const summarizationPrompt =
    'Based on the conversation above, provide a concise summary that captures the essence for future reference.';

  const contentsToSummarize: Content[] = [
    ...(messagesInOrderDoc.size > 0
      ? getContentsArray(messagesInOrderDoc)
      : []),
    { role: 'model', parts: [{ text: responseFromModel }] },
    {
      role: 'user',
      parts: [
        {
          text: summarizationPrompt,
        },
      ],
    },
  ];

  const batch = db.batch();

  const instructions = [
    `You are an AI tasked with generating concise, factual summaries of chat conversations for long-term memory. Extract all key information: user's primary goal, decisions made, critical facts exchanged, any unresolved issues, and the current status of the conversation. The summary should be readable by another AI for future context. Do NOT include conversational filler, greetings, or pleasantries. Keep it under 4000 tokens.`,
  ];

  if (systemInstruction) {
    instructions.push(
      `Original system instruction used in the chats you are to summarize: "${systemInstruction}"`,
    );
  }

  const newSystemMessageRef = messagesRef.doc();
  batch.set(newSystemMessageRef, {
    role: 'system',
    contents: [{ type: 'text', text: summarizationPrompt }],
    timestamp: new Date(),
    tokenCount: null,
    isSummary: false,
  } as Message);

  const summaryResponse = await geminiAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contentsToSummarize,
    config: {
      ...chatConfig,
      temperature: 0.3,
      systemInstruction: instructions,
      thinkingConfig: { thinkingBudget: -1 },
    },
  });

  if (
    summaryResponse.text &&
    !summaryResponse.promptFeedback?.blockReasonMessage
  ) {
    const inputTokenCount =
      summaryResponse.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (summaryResponse.usageMetadata?.candidatesTokenCount ?? 0) +
      (summaryResponse.usageMetadata?.thoughtsTokenCount ?? 0);

    batch.update(newSystemMessageRef, {
      tokenCount: inputTokenCount,
    });

    const newModelSummarizedMessageRef = messagesRef.doc();
    batch.set(newModelSummarizedMessageRef, {
      role: 'model',
      contents: [{ type: 'text', text: summaryResponse.text }],
      timestamp: new Date(),
      tokenCount: outputTokenCount,
      isSummary: true,
    } as Message);

    await batch.commit();

    return {
      summarizedMessageId: newModelSummarizedMessageRef.id,
      inputTokenCount,
      outputTokenCount,
    };
  }

  return null;
}
