import { computed, ref } from 'vue';

import { apiClient } from '@/services/api';
import type { NotificationDTO } from '@/api';

const notifications = ref<NotificationDTO[]>([]);
const isOpen = ref<boolean>(false);

const total = ref<number>(0);

export function useNotifications() {

  const getNotifications = async (page: number, loadMore: boolean = false) => {
    const limit: number = 5;
    try {
      const { data } = (await apiClient.openApi.notifications.notificationsGet({
        page: page,
        limit: limit
      }));
      total.value = data.total;
      if (loadMore) {
        notifications.value.push(...data.items);
      } else {
        notifications.value = data.items;
      }
    } catch (err) {
      console.log(err);
    };
  };

  const unreadNotifications = computed<boolean>(() => {
    return (notifications.value.filter(not => not.isRead !== true).length > 0);
  });


  const addNotification = (notification: NotificationDTO) => {
    notifications.value.unshift(notification);
    console.log(notifications.value);
  };

  const markAsRead = async (id: NotificationDTO['id']) => {
    try {
      await apiClient.openApi.notifications.notificationsNotificationIdReadPost({notificationId: id});
      const n = notifications.value.find(n => n.id === id);
      if (n) n.isRead = true;
    } catch (err) {
      console.log(err);
      throw new Error('Unexpected error');
    }
  };

  const toggleOpen = () => {
    isOpen.value = !isOpen.value;
  };

  return { notifications, unreadNotifications, addNotification, markAsRead, isOpen, toggleOpen, getNotifications, total };
}
