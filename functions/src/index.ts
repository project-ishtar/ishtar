import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

admin.initializeApp();

export const db = admin.firestore();
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export * from './functions/ai-function';
export * from './functions/auth-function';
