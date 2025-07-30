import admin from 'firebase-admin';
import { auth } from 'firebase-functions/v1';

const db = admin.firestore();

export const createUserProfile = auth.user().onCreate(async (user) => {
  const userRef = db.collection('users').doc(user.uid);
  try {
    await userRef.set(
      {
        email: user.email || null,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        hasCompletedOnboarding: false,
        role: 'basic',
      },
      { merge: true },
    );
    console.log(`User profile created for ${user.uid}`);
  } catch (error) {
    console.error(`Error creating user profile for ${user.uid}:`, error);
  }
});
