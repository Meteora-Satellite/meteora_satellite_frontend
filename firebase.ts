// firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyCZx28A34HbPW4X-clmKgg_F4jMIB5aiEE',
  authDomain: 'meteora-satellite.firebaseapp.com',
  projectId: 'meteora-satellite',
  storageBucket: 'meteora-satellite.appspot.com',
  messagingSenderId: '490980887667',
  appId: '1:490980887667:web:c4644e1447cbdea6daee06',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Init messaging
const messaging = getMessaging(app);

export { app, messaging, getToken, onMessage };
