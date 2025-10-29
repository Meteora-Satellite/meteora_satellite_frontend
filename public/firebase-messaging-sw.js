/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCZx28A34HbPW4X-clmKgg_F4jMIB5aiEE',
  authDomain: 'meteora-satellite.firebaseapp.com',
  projectId: 'meteora-satellite',
  storageBucket: 'meteora-satellite.firebasestorage.app',
  messagingSenderId: '490980887667',
  appId: '1:490980887667:web:c4644e1447cbdea6daee06',
});

const messaging = firebase.messaging();

// Обработка фоновых уведомлений
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  const notificationTitle = payload.notification?.title || 'Новое уведомление';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon.png', // можно поменять
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
