import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import {
  type Functions,
  getFunctions,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { type Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDK1qKJ1HOZh4_6wGwO48Z31kC7StNmJR4',
  authDomain: 'ishtar-28377.firebaseapp.com',
  projectId: 'ishtar-28377',
  storageBucket: 'ishtar-28377.firebasestorage.app',
  messagingSenderId: '616338655613',
  appId: '1:616338655613:web:45feb071808bc44a356414',
  measurementId: 'G-B0DQFJQB6B',
};

export class FirebaseAppConfig {
  private static _app: FirebaseApp;
  private static _analytics: Analytics;
  private static _functions: Functions;
  private static _auth: Auth;
  private static _firestore: Firestore;

  constructor() {
    const _app = initializeApp(firebaseConfig);

    FirebaseAppConfig._app = _app;
    FirebaseAppConfig._analytics = getAnalytics(_app);
    FirebaseAppConfig._functions = getFunctions(_app);
    FirebaseAppConfig._auth = getAuth(_app);
    FirebaseAppConfig._firestore = getFirestore(_app);

    if (window.location.hostname === 'localhost') {
      connectFunctionsEmulator(FirebaseAppConfig._functions, 'localhost', 5001);
      connectAuthEmulator(FirebaseAppConfig._auth, 'http://localhost:9099');
      connectFirestoreEmulator(FirebaseAppConfig._firestore, 'localhost', 8080);
    }
  }

  get app() {
    return FirebaseAppConfig._app;
  }

  get analytics() {
    return FirebaseAppConfig._analytics;
  }

  get functions() {
    return FirebaseAppConfig._functions;
  }

  get auth(): Auth {
    return FirebaseAppConfig._auth;
  }

  get firestore(): Firestore {
    return FirebaseAppConfig._firestore;
  }
}

export const firebaseApp = new FirebaseAppConfig();
