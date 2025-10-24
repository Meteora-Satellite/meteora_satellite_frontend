<script setup lang="ts">
import { useWallet } from 'solana-wallets-vue';
import { computed } from 'vue';

interface Props {
  open: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'select', wallet: any): void
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { wallets } = useWallet();

const availableWallets = computed(() => wallets.value || []);

const getWalletIcon = (walletName: string): string => {
  const icons: Record<string, string> = {
    Phantom: '👻',
    Solflare: '🔆',
    Coinbase: '🔵',
  };
  return icons[walletName] || '💼';
};

const handleSelect = (wallet: any) => {
  emit('select', wallet);
  emit('close');
};

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close');
  }
};
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click="handleBackdropClick"
    >
      <div
        class="relative w-full max-w-md rounded-xl bg-card/90 backdrop-blur-md border border-border p-6 shadow-2xl"
        @click.stop
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">Connect Wallet</h2>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <p class="mb-6 text-sm text-muted-foreground">
          Select your wallet to continue. Make sure your wallet extension is installed.
        </p>

        <div class="space-y-3">
          <button
            v-for="wallet in availableWallets"
            :key="wallet.adapter.name"
            class="w-full flex items-center gap-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-left transition-all hover:bg-accent hover:border-accent-foreground hover:scale-[1.02] active:scale-[0.98]"
            @click="handleSelect(wallet)"
          >
            <span class="text-3xl">{{ getWalletIcon(wallet.adapter.name) }}</span>
            <div class="flex-1">
              <div class="font-semibold">{{ wallet.adapter.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ wallet.readyState === 'Installed' ? 'Detected' : 'Not installed' }}
              </div>
            </div>
            <span class="text-muted-foreground">→</span>
          </button>
        </div>

        <div class="mt-6 text-center text-xs text-muted-foreground">
          New to Solana?
          <a
            href="https://phantom.app/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            Get Phantom Wallet
          </a>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
