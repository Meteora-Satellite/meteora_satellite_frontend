<script setup lang="ts">
import { PATTERN_BACKGROUND_DIRECTION, PATTERN_BACKGROUND_SPEED, PATTERN_BACKGROUND_VARIANT } from './components/ui/pattern-background';
import PatternBackground from './components/ui/pattern-background/PatternBackground.vue';

import { Toaster } from '@/components/ui/sonner';

import 'vue-sonner/style.css';

import { onMounted } from 'vue';
import { messaging, getToken, onMessage } from '../firebase';
import { toast } from 'vue-sonner';
import { useNotifications } from './composables/useNotifications';
import type { Notification } from './services/api';

const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;

onMounted(async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      console.log('FCM Token:', token);
    } else {
      toast.error('You have blocked notifications');
    }
    onMessage(messaging, (payload) => {
      console.log(payload);
      const newNotif:Notification = {
        title: payload.notification?.title ?? '',
        body: payload.notification?.body ?? '',
        id: '',
        createdAt: '',
        type: 'closePosition',
        isRead: false
        
      }
      toast.info(newNotif.title, {
        description: newNotif.body,
        action: {
          label: 'Open',
          onClick: () => useNotifications().toggleOpen()
        }
      });
      useNotifications().addNotification(newNotif);
    });
  } catch (err) {
    console.error('Ошибка при инициализации FCM:', err);
  }
});

</script>

<template>
  <PatternBackground
    :direction="PATTERN_BACKGROUND_DIRECTION.Bottom"
    :variant="PATTERN_BACKGROUND_VARIANT.Grid"
    class="h-full w-full"
    :speed="PATTERN_BACKGROUND_SPEED.Slow"
    animate
  >
    <RouterView />
    <Toaster />
  </PatternBackground>
</template>