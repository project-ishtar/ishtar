import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';

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
  private static app: FirebaseApp;
  private static analytics: Analytics;

  constructor() {
    FirebaseAppConfig.app = initializeApp(firebaseConfig);
    FirebaseAppConfig.analytics = getAnalytics(FirebaseAppConfig.app);
  }

  getApp() {
    return FirebaseAppConfig.app;
  }

  getAnalytics() {
    return FirebaseAppConfig.analytics;
  }
}
