<script setup lang="ts">
import { onMounted, ref, Transition } from 'vue';
import { useNotifications } from '@/composables/useNotifications';
import { Dot, MailOpen } from 'lucide-vue-next';
import Button from './ui/button/Button.vue';
import { toast } from 'vue-sonner';
import { apiClient } from '@/services/api';

const {
  notifications,
  isOpen,
  toggleOpen,
  markAsRead,
  getNotifications,
  total,
  unreadNotifications
} = useNotifications()
const page = ref<number>(1);
onMounted(() => {
  getNotifications(page.value);
});

const readAll = async () => {
  try {
    await apiClient.openApi.notifications.notificationsReadAllPost()
    notifications.value.forEach((n) => n.isRead = true)
  } catch (err) {
    console.log(err);
    toast.error('Unexpected error');
  }
}
</script>

<template>
  <!-- затемнение -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      @click="toggleOpen"
    />
  </Transition>

  <!-- выезжающая панель -->
  <Transition name="slide">
    <aside
      v-if="isOpen"
      class="fixed right-0 top-0 w-80 h-full bg-card shadow-sm border rounded-l-xl z-50 flex flex-col"
    >
      <header class="p-4 border-b flex justify-between items-center">
        <h2 class="font-semibold text-lg">Notifications</h2>
        <Button
          v-if="unreadNotifications"
          class="cursor-pointer bg-card text-sm text-white-400 border hover:bg-accent"
          @click="readAll()"
        >Read All <MailOpen :size="12" /></Button>
        <button style="cursor: pointer;" @click="toggleOpen">✕</button>
      </header>

      <div class="flex-1 overflow-y-auto divide-y">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="p-4 hover:bg-card-50 flex flex-col gap-1 cursor-pointer"
          @click="markAsRead(n.id)"
        >
          <div class="flex justify-between">
            <span class="font-medium">{{ n.title }}
              <Dot
                v-if="n.isRead === false"
                class="inline"
                color="#c18aff"
              />
            </span>
          </div>
          <p class="text-sm text-gray-600">{{ n.body }}</p>
          <p class="text-xs text-gray-400">{{ new Date(n.createdAt).toLocaleString() }}</p>
        </div>
        <div
          v-if="total > notifications.length"
          class="flex align-center justify-center"
        >
          <Button
            class="mt-3 mb-3 ml-a mr-a cursor-pointer"
            @click="() => {
              page++;
              getNotifications(page, true);
            }"
          >
            Load more
          </Button>
        </div>

        <div v-if="!notifications.length" class="p-6 text-center text-gray-500">
          No notifications
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from {
  transform: translateX(100%);
}
.slide-leave-to {
  transform: translateX(100%);
}
</style>
