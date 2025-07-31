import type { GenerateContentConfig } from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  Message,
} from '@ishtar/commons/types';
import { ai, db } from '../index';
import { getGlobalSettings } from '../cache/cached-global-settings';
import { DocumentData } from 'firebase/firestore';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';

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

      const newConversation: Conversation = {
        id: newConversationRef.id,
        createdAt:
          admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
        lastUpdated:
          admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
        isDeleted: false,
        title: `New Chat - ${new Date().toLocaleDateString()}`,
        chatSettings: {
          model: globalSettings.defaultGeminiModel,
          temperature: globalSettings.temperature,
        },
        messages: [],
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

    const batch = db.batch();

    const newUserMessageRef = messagesRef.doc();

    batch.set(newUserMessageRef, {
      id: newUserMessageRef.id,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    } as Message);

    const response = await ai.models.generateContent({
      model:
        conversation?.chatSettings?.model ??
        globalSettings?.defaultGeminiModel ??
        'gemini-2.0-flash-lite',
      contents: prompt,
      config: {
        ...chatConfig,
        systemInstruction: conversation?.chatSettings?.systemInstruction ?? '',
        temperature:
          conversation?.chatSettings?.temperature ??
          globalSettings?.temperature ??
          1,
      },
    });

    if (!response || !response.text) {
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

    const newModelMessageRef = messagesRef.doc();

    batch.set(newModelMessageRef, {
      id: newModelMessageRef.id,
      role: 'model',
      content: response.text,
      timestamp: new Date(),
    } as Message);

    batch.update(conversationRef, {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log('Committed');

    return {
      id: newModelMessageRef.id,
      response: response.text,
      tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
      conversationId,
    };
  },
);

export const chatMessageConverter: FirestoreDataConverter<Message> = {
  toFirestore: (message: Message): DocumentData => {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp:
        message.timestamp instanceof Date
          ? admin.firestore.Timestamp.fromDate(message.timestamp)
          : message.timestamp,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<Message>): Message => {
    const data = snapshot.data();
    return {
      id: data.id,
      role: data.role,
      content: data.content,
      timestamp: (
        data.timestamp as unknown as admin.firestore.Timestamp
      ).toDate(),
    };
  },
};
