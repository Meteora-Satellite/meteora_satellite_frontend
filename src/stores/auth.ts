import type { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import { apiClient } from '@/services/api';
import { usePositionsStore } from '@/stores/positions';

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  const publicKey = ref<PublicKey | null>(null);
  const authenticated = ref(false);
  const signedMessage = ref<string | null>(null);
  const signature = ref<Uint8Array | null>(null);

  const walletAddress = computed(() => (publicKey.value ? publicKey.value.toBase58() : null));

  // User is authenticated if they have valid tokens, regardless of wallet connection
  const isAuthenticated = computed(() => authenticated.value);

  // Основной процесс аутентификации с backend
  async function signIn(
    walletPublicKey: PublicKey,
    signMessageFn: (message: Uint8Array) => Promise<Uint8Array>,
  ): Promise<boolean> {
    try {
      const address = walletPublicKey.toBase58();

      // 1. Запрашиваем готовое SIWS message с сервера
      const nonceResponse = await apiClient.getNonce(address);

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const message = nonceResponse.data.message;
      signedMessage.value = message;

      // 2. Запрашиваем подпись у кошелька
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessageFn(messageBytes);
      const signatureBase58 = bs58.encode(signatureBytes);

      // 3. Отправляем на сервер для верификации и получения токенов
      const response = await apiClient.verifySignature({
        address,
        signature: signatureBase58,
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      // 4. Сохраняем аутентифицированное состояние
      publicKey.value = walletPublicKey;
      authenticated.value = true;
      signature.value = signatureBytes;

      // Load user data after successful authentication
      await getInternalWallet();

      // Load all user positions
      const positionsStore = usePositionsStore();
      await positionsStore.loadAllPositions();

      return true;
    } catch {
      authenticated.value = false;
      return false;
    }
  }

  // Выход из системы
  async function signOut() {
    try {
      await apiClient.logout();
      publicKey.value = null;
      authenticated.value = false;
      signedMessage.value = null;
      signature.value = null;
      internalWallet.value = null;
      apiClient.clearTokens();
      router.push('/login');

      // Clear positions on logout
      const positionsStore = usePositionsStore();
      positionsStore.clearPositions();
      router.push('/login');
    } catch (err) {
      console.log('Logout error', err);
      throw new Error('Logout error');
    }
  }

  const internalWallet = ref<any>(null);
  const getInternalWallet = async () => {
    const response = await apiClient.getWallet();
    internalWallet.value = response;

    // Load positions when wallet is retrieved (for restored sessions)
    const positionsStore = usePositionsStore();
    await positionsStore.loadAllPositions();
  };

  // Check if user has valid tokens and restore authentication state
  function checkAuthFromStorage(): boolean {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (accessToken && refreshToken) {
      authenticated.value = true;
      return true;
    }

    authenticated.value = false;
    return false;
  }

  // Initialize auth state from localStorage
  checkAuthFromStorage();

  return {
    // State
    publicKey,
    authenticated,
    signedMessage,
    signature,
    internalWallet,

    // Computed
    walletAddress,
    isAuthenticated,

    // Actions
    signIn,
    signOut,
    getInternalWallet,
    checkAuthFromStorage,
  };
});
