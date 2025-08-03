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
import admin from 'firebase-admin';
import { chatMessageConverter } from '../converters/message-converter';
import { getUserById } from '../cache/user-cache';
import { getGlobalSettings } from '../cache/global-settings';

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
          model: globalSettings.defaultGeminiModel,
          temperature: globalSettings.temperature,
          systemInstruction: null,
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

    if (conversation.summarizedMessageId) {
      const summarizedMessageDoc = await messagesRef
        .doc(conversation.summarizedMessageId)
        .get();

      messagesInOrderDoc = await messagesRef
        .orderBy('timestamp', 'asc')
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAt(summarizedMessageDoc)
        .get();

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

      contents.push(
        ...getContentsArray(previousMessagesInOrderSnapshot).reverse(),
      );

      contents.push(...contentsAfterSummary);
    } else {
      messagesInOrderDoc = await messagesRef.orderBy('timestamp', 'asc').get();

      contents.push(...getContentsArray(messagesInOrderDoc));
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const batch = db.batch();

    const model =
      conversation?.chatSettings?.model ?? globalSettings.defaultGeminiModel;

    if (!model) {
      throw new HttpsError('permission-denied', 'No AI model available.');
    }

    const newUserMessageRef = messagesRef.doc();

    batch.set(newUserMessageRef, {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      tokenCount: null,
      isSummary: false,
    } as Message);

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        ...chatConfig,
        systemInstruction:
          conversation?.chatSettings?.systemInstruction ?? undefined,
        temperature:
          conversation?.chatSettings?.temperature ?? globalSettings.temperature,
        ...(model !== 'gemini-2.5-pro'
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    });

    if (!response) {
      throw new HttpsError('internal', 'Something went wrong.');
    }

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount = response.usageMetadata?.candidatesTokenCount ?? 0;

    console.log(`Usage metadata: ${JSON.stringify(response.usageMetadata)}`);

    batch.update(newUserMessageRef, {
      tokenCount: inputTokenCount,
    });

    const totalInputTokenCount =
      (conversation.inputTokenCount ?? 0) + inputTokenCount;
    const totalOutputTokenCount =
      (conversation.outputTokenCount ?? 0) + outputTokenCount;

    const tokenCountForConversation =
      totalInputTokenCount + totalOutputTokenCount;

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

    JSON.stringify(`model used: ${JSON.stringify(response.modelVersion)}`);
    JSON.stringify(
      `prompt feedback: ${JSON.stringify(response.promptFeedback)}`,
    );

    return {
      id: newModelMessageRef.id,
      response: response.text,
      tokenCount: tokenCountForConversation,
      conversationId,
    };
  },
);
