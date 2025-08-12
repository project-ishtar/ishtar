import admin from 'firebase-admin';

admin.initializeApp();

export const db = admin.firestore();

export * from './functions/ai-function';
export * from './functions/auth-function';
