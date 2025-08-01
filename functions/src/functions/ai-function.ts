import { Content, GenerateContentConfig } from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  DraftConversation,
  Message,
} from '@ishtar/commons/types';
import { ai, db } from '../index';
import { getGlobalSettings } from '../cache/cached-global-settings';
import admin from 'firebase-admin';
import { chatMessageConverter } from '../converters/message-converter';

const functionOptions = {
  secrets: ['GEMINI_API_KEY'],
};

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

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
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be authenticated to call this function.',
      );
    }

    const globalSettings = await getGlobalSettings();

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
          model: globalSettings.defaultGeminiModel,
          temperature: globalSettings.temperature,
          systemInstruction: null,
        },
        summarizedMessageId: null,
        tokenCount: 0,
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

    if (conversation.summarizedMessageId) {
      const summarizedMessageDoc = await messagesRef
        .doc(conversation.summarizedMessageId)
        .get();

      messagesInOrderDoc = await messagesRef
        .orderBy('timestamp', 'asc')
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAt(summarizedMessageDoc)
        .get();

      const previousMessagesInOrderRef = await messagesRef
        .orderBy('timestamp', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAfter(summarizedMessageDoc)
        .limit(11 - messagesInOrderDoc.size)
        .get();

      contents.push(...getContentsArray(messagesInOrderDoc));
      contents.push(...getContentsArray(previousMessagesInOrderRef).reverse());
    } else {
      messagesInOrderDoc = await messagesRef.orderBy('timestamp', 'asc').get();

      contents.push(...getContentsArray(messagesInOrderDoc));
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const batch = db.batch();

    const model =
      conversation?.chatSettings?.model ??
      globalSettings?.defaultGeminiModel ??
      'gemini-2.0-flash-lite';

    const newUserMessageRef = messagesRef.doc();

    batch.set(newUserMessageRef, {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      tokenCount: null,
    } as Message);

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        ...chatConfig,
        systemInstruction: conversation?.chatSettings?.systemInstruction
          ? {
              role: 'system',
              text: conversation?.chatSettings?.systemInstruction,
            }
          : undefined,
        temperature:
          conversation?.chatSettings?.temperature ??
          globalSettings?.temperature ??
          1,
      },
    });

    if (!response) {
      throw new HttpsError('internal', 'Something went wrong.');
    }

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount = response.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokenCount = response.usageMetadata?.totalTokenCount ?? 0;

    batch.update(newUserMessageRef, {
      tokenCount: inputTokenCount,
    });

    let tokenCountForConversation =
      (conversation.tokenCount ?? 0) + totalTokenCount;

    batch.update(conversationRef, {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      tokenCount: tokenCountForConversation,
    });

    const newModelMessageRef = messagesRef.doc();

    batch.set(newModelMessageRef, {
      role: 'model',
      content: response.text,
      timestamp: new Date(),
      tokenCount: outputTokenCount,
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

    if (totalTokenCount >= 15000) {
      const summarizationPrompt =
        'Based on the conversation above, provide a concise summary that captures the essence for future reference.';

      const contentsToSummarize: Content[] = [
        ...(messagesInOrderDoc.size > 0
          ? getContentsArray(messagesInOrderDoc)
          : []),
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: response.text }] },
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

      const maxOutputTokens = 2000;

      const instructions = [
        `You are an AI tasked with generating concise, factual summaries of chat conversations for long-term memory. Extract all key information: user's primary goal, decisions made, critical facts exchanged, any unresolved issues, and the current status of the conversation. The summary should be readable by another AI for future context. Do NOT include conversational filler, greetings, or pleasantries. Keep it under ${maxOutputTokens} tokens.`,
      ];

      if (conversation?.chatSettings?.systemInstruction) {
        instructions.push(
          `Original system instruction used in the chats you are to summarize: "${conversation?.chatSettings?.systemInstruction}"`,
        );
      }

      const newSystemMessageRef = messagesRef.doc();
      batch.set(newSystemMessageRef, {
        role: 'system',
        content: summarizationPrompt,
        timestamp: new Date(),
        tokenCount: null,
      } as Message);

      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contentsToSummarize,
        config: {
          ...chatConfig,
          temperature: 0.3,
          systemInstruction: instructions,
          maxOutputTokens,
        },
      });

      const totalTokenCount =
        summaryResponse.usageMetadata?.totalTokenCount ?? 0;

      const totalTokenCountWithSummary =
        tokenCountForConversation + totalTokenCount;

      tokenCountForConversation = totalTokenCountWithSummary;

      batch.update(newSystemMessageRef, {
        tokenCount: summaryResponse.usageMetadata?.promptTokenCount ?? 0,
      });

      const newModelSummarizedMessageRef = messagesRef.doc();
      batch.set(newModelSummarizedMessageRef, {
        role: 'model',
        content: summaryResponse.text,
        timestamp: new Date(),
        tokenCount: totalTokenCount,
      } as Message);

      batch.update(conversationRef, {
        summarizedMessageId: newModelSummarizedMessageRef.id,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        tokenCount: totalTokenCountWithSummary,
      });

      await batch.commit();
    }

    return {
      id: newModelMessageRef.id,
      response: response.text,
      tokenCount: tokenCountForConversation,
      conversationId,
    };
  },
);
