<script setup lang="ts">
import { useWallet } from 'solana-wallets-vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import HyperText from '@/components/ui/hyper-text/HyperText.vue';
import ShimmerButton from '@/components/ui/shimmer-button/ShimmerButton.vue';
import WalletSelectModal from '@/components/WalletSelectModal.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const showWalletModal = ref(false);

const { select, connect, disconnect, publicKey, signMessage, wallet } = useWallet();
const authStore = useAuthStore();

// Open wallet selection modal
const handleSignIn = async () => {
  // Ensure we start with a clean state
  if (wallet.value) {
    try {
      await disconnect();
    } catch (error) {
      // Cleanup disconnect (expected if not connected)
    }
  }
  showWalletModal.value = true;
};

// Handle wallet selection and immediate authentication
const handleWalletSelect = async (wallet: any) => {
  try {
    // Close modal
    showWalletModal.value = false;

    // Select wallet first
    select(wallet.adapter.name);

    // Wait for next tick to ensure wallet state is updated
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now connect to the selected wallet
    await connect();

    // Wait for publicKey and signMessage to be available
    if (!publicKey.value || !signMessage?.value) {
      throw new Error('Wallet connection failed');
    }

    // Immediately trigger authentication
    const success = await authStore.signIn(publicKey.value, signMessage.value);

    if (success) {
      toast.success('Successfully authenticated!');
      router.push({ name: 'main' });
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {

    // Determine if user cancelled or if there was an actual error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userCancelled = errorMessage.toLowerCase().includes('user rejected') ||
                          errorMessage.toLowerCase().includes('cancelled') ||
                          errorMessage.toLowerCase().includes('canceled');

    if (userCancelled) {
      toast.info('Connection cancelled');
    } else {
      toast.error('Authentication failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }

    // Reset state: fully disconnect and clear wallet selection
    try {
      await disconnect();
      select(null as any); // Clear wallet selection
    } catch (disconnectError) {
      // Failed to disconnect
    }
  }
};

// Disconnect wallet and sign out
const handleDisconnect = async () => {
  try {
    await disconnect();
    authStore.signOut();
    toast.info('Disconnected');
  } catch (error) {
    toast.error('Failed to disconnect');
  }
};
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center px-8">
    <Card class="relative w-full max-w-2xl bg-card/40 backdrop-blur-xs">
      <CardHeader>
        <CardTitle class="flex flex-col justify-center items-center gap-2">
          <img src="/logos/logo-dark.png" class="h-8"/>
          <HyperText text="Beta version" :animate-on-load="true"/>
        </CardTitle>
      </CardHeader>

      <CardContent class="space-y-4">
        <p>In order to use application please login using your web3 wallet.</p>
      </CardContent>

      <CardFooter class="justify-end">
        <ShimmerButton
          v-if="!authStore.isAuthenticated"
          shimmer-size="2px"
          border-radius="10px"
          @click="handleSignIn"
        >
          <span
            class="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg"
          >
            Sign In
          </span>
        </ShimmerButton>

        <ShimmerButton
          v-else
          shimmer-size="2px"
          border-radius="10px"
          @click="handleDisconnect"
        >
          <span
            class="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg"
          >
            Disconnect
          </span>
        </ShimmerButton>
      </CardFooter>
    </Card>

    <!-- Wallet selection modal -->
    <WalletSelectModal
      :open="showWalletModal"
      @close="showWalletModal = false"
      @select="handleWalletSelect"
    />
  </div>
</template>
