<script setup lang="ts">
import { PATTERN_BACKGROUND_DIRECTION, PATTERN_BACKGROUND_SPEED, PATTERN_BACKGROUND_VARIANT } from './components/ui/pattern-background';
import PatternBackground from './components/ui/pattern-background/PatternBackground.vue';

import { Toaster } from '@/components/ui/sonner';

import 'vue-sonner/style.css';

import { onMounted, ref, watch } from 'vue';
// import { messaging, getToken, onMessage, isSupported } from '../firebase';
import { getFCMMessaging } from '../firebase';
import { toast } from 'vue-sonner';
import { useNotifications } from './composables/useNotifications';
import Header from './components/Header.vue';
import { useAuthStore } from './stores/auth';
import type { NotificationDTO } from './api';
import { apiClient } from './services/api';
import { useWSClientStore } from './stores/ws';
import { getToken, onMessage } from 'firebase/messaging';

const authStore = useAuthStore();
const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;

async function initFCM() {
  if (!authStore.isAuthenticated) return;
  const messaging = await getFCMMessaging();
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('You have blocked notifications');
      return;
    }

    const token = await getToken(messaging, { vapidKey });
    if (token) {
      await apiClient.openApi.push.pushRegisterPost({
        pushRegisterBody: { token }
      });
    }

    onMessage(messaging, (payload:any) => {
      const newNotif:NotificationDTO = {
        title: payload.notification?.title ?? '',
        body: payload.notification?.body ?? '',
        id: payload.data.notificationId,
        createdAt: new Date(),
        data: {},
        type: 'closePosition',
        isRead: false
      };

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
}
onMounted(() => {
  initFCM();

  useWSClientStore().initWSClient()
});

watch(
  () => authStore.isAuthenticated,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      initFCM();
    } else if (!newVal && oldVal) {
      const unregisterFCM = async () => {
        try {
          const messaging = await getFCMMessaging();
          if (!messaging) return;
          const token = await getToken(messaging, { vapidKey });
          await apiClient.openApi.push.pushUnregisterPost({
            pushUnregisterBody: { token }
          });
        } catch (err) {
          console.error(err);
        }
      };
      unregisterFCM();
    }
  }
);


// onMounted(async () => {
  
// });

</script>

<template>
  <PatternBackground
    :direction="PATTERN_BACKGROUND_DIRECTION.Bottom"
    :variant="PATTERN_BACKGROUND_VARIANT.Grid"
    class="h-full w-full"
    :speed="PATTERN_BACKGROUND_SPEED.Slow"
    animate
  >

    <p style="color:#fff">{{  }}</p>
    <Header
      v-if="useAuthStore().authenticated === true"
    />
    <RouterView />
    <Toaster />
  </PatternBackground>
</template>