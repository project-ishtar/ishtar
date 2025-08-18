import { Content, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  DraftConversation,
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
          parts: [{ text: message.content }],
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

    const { prompt, conversationId: convoId } = request.data;

    const conversationsRef = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('conversations');

    let conversationId = convoId;

    if (!conversationId) {
      const newConversationRef = conversationsRef.doc();

      const newConversation: DraftConversation = {
        createdAt:
          admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
        lastUpdated:
          admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
        isDeleted: false,
        title: `New Chat - ${Date.now()}`,
        chatSettings: {
          model: globalSettings.defaultModel,
          temperature: globalSettings.temperature,
          systemInstruction: null,
          enableMultiTurnConversation:
            globalSettings.enableMultiTurnConversation,
          enableThinking: globalSettings.enableThinking,
          thinkingCapacity: null,
        },
        summarizedMessageId: null,
        inputTokenCount: 0,
        outputTokenCount: 0,
      };

      conversationId = newConversationRef.id;

      await newConversationRef.set(newConversation);
    }

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

        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .orderBy(admin.firestore.FieldPath.documentId())
          .startAt(summarizedMessageDoc)
          .get();

        tokenCount += countTokens(messagesInOrderDoc);

        const contentsArray = getContentsArray(messagesInOrderDoc);

        const summaryContent = contentsArray[0];
        const contentsAfterSummary = contentsArray.splice(1);

        contents.push(summaryContent);

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

        contents.push(...contentsAfterSummary);
      } else {
        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .get();

        tokenCount += countTokens(messagesInOrderDoc);

        contents.push(...getContentsArray(messagesInOrderDoc));
      }
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    console.log(`contents length: ${contents.length}`);

    const batch = db.batch();

    const newUserMessageRef = messagesRef.doc();

    batch.set(newUserMessageRef, {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      tokenCount: null,
      isSummary: false,
    } as Message);

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
      throw new HttpsError('internal', 'Something went wrong.');
    }

    if (response.promptFeedback) {
      console.log(
        `prompt feedback: ${JSON.stringify(response.promptFeedback)}`,
      );
    }

    const promptResponseToken = await geminiAI.models.countTokens({
      model,
      contents: [prompt, response.text ?? ''],
    });

    tokenCount += promptResponseToken?.totalTokens ?? 0;

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (response.usageMetadata?.candidatesTokenCount ?? 0) +
      (response.usageMetadata?.thoughtsTokenCount ?? 0);

    console.log(`Usage metadata: ${JSON.stringify(response.usageMetadata)}`);

    batch.update(newUserMessageRef, {
      tokenCount: inputTokenCount,
    });

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
      content: response.text ?? '',
      timestamp: new Date(),
      tokenCount: outputTokenCount,
      isSummary: false,
    } as Message);

    await batch.commit();

    if (!response.text) {
      throw new HttpsError(
        'internal',
        'The AI model failed to generate a response. Please try again.',
      );
    }

    if (response.promptFeedback?.blockReason) {
      throw new HttpsError(
        'permission-denied',
        response.promptFeedback.blockReasonMessage ??
          'AI refused to generate a response.',
      );
    }

    let summaryInputTokenCount = 0;
    let summaryOutputTokenCount = 0;

    console.log(`token count: ${tokenCount}`);

    if (isChatModel && tokenCount >= 75000) {
      console.log('summary');
      try {
        const summaryResponse = await generateSummary({
          messagesInOrderDoc: messagesInOrderDoc!,
          messagesRef,
          systemInstruction: conversation?.chatSettings?.systemInstruction,
          userPrompt: prompt,
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
      id: newModelMessageRef.id,
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
  userPrompt,
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
  userPrompt: string;
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
    { role: 'user', parts: [{ text: userPrompt }] },
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
    content: summarizationPrompt,
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
      content: summaryResponse.text ?? '',
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
