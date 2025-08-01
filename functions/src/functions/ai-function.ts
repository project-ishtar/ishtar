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

    const messagesInOrderRef = await messagesRef
      .orderBy('timestamp', 'desc')
      .get();

    const contents: Content[] = [];

    messagesInOrderRef.forEach((messageRef) => {
      if (messageRef.exists) {
        const message = messageRef.data() as Message;
        contents.push({
          role: message.role,
          parts: [{ text: message.content }],
        });
      }
    });

    contents.reverse();

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const batch = db.batch();

    const model =
      conversation?.chatSettings?.model ??
      globalSettings?.defaultGeminiModel ??
      'gemini-2.0-flash-lite';

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        ...chatConfig,
        systemInstruction: conversation?.chatSettings?.systemInstruction ?? '',
        temperature:
          conversation?.chatSettings?.temperature ??
          globalSettings?.temperature ??
          1,
      },
    });

    if (!response) {
      throw new HttpsError('internal', 'Something went wrong.');
    }

    const totalTokenCount = response.usageMetadata?.totalTokenCount ?? 0;
    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount = response.usageMetadata?.candidatesTokenCount ?? 0;

    const newUserMessageRef = messagesRef.doc();

    batch.set(newUserMessageRef, {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      tokenCount: inputTokenCount,
    } as Message);

    const tokenCountForConversation =
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

    return {
      id: newModelMessageRef.id,
      response: response.text,
      tokenCount: tokenCountForConversation,
      conversationId,
    };
  },
);
