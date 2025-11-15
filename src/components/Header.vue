<script lang="ts" setup>
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Card from '@/components/ui/card/Card.vue';
import { Input } from '@/components/ui/input';
import NotificationsSidebar from '@/components/NotificationsSidebar.vue';
import { useNotifications } from '@/composables/useNotifications';
import { Bell, BellDot } from 'lucide-vue-next';
import PrivateKey from '@/components/Modals/PrivateKey.vue';
import { computed, onBeforeMount, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { usePoolsStore } from '@/stores/pools';
import { toast } from 'vue-sonner';
import { Button } from './ui/button';
import { useBalanceStore } from '@/stores/balance';

import bs58 from 'bs58';
import { useWallet } from 'solana-wallets-vue';
import { apiClient } from '@/services/api';

const authStore = useAuthStore();
const poolsStore = usePoolsStore();
const {balance, getBalance} = useBalanceStore()

const urlInput = ref<any>(poolsStore.urlInput)

onBeforeMount(async () => {
  // getBalance();

  if (!authStore.internalWallet) {
      await authStore.getInternalWallet();
    }
})

const walletAddress = computed(() => {
  if (!authStore.internalWallet?.data?.address) return null;
  const addr = authStore.internalWallet.data.address;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
});

const showPrivateKeyModal = ref<boolean>(false)


// Handle config (placeholder)
function handleConfig() {
  toast.info('Config', {
    description: 'Configuration panel coming soon...',
  });
}

// Copy internal wallet address to clipboard
async function copyInternalWallet() {
  try {
    const address = authStore.internalWallet?.data?.address;
    if (!address) {
      toast.error('Internal wallet address not available');
      return;
    }

    await navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  } catch (error) {
    toast.error('Failed to copy address');
  }
}


// Handle paste event
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text');
  if (pastedText) {
    poolsStore.setUrlInput(pastedText)
    urlInput.value = pastedText
    handleUrlSubmit();
  }
}

// Handle URL input (on Enter key or paste)
function handleUrlSubmit() {
  if (!poolsStore.urlInput?.trim()) {
    toast.error('Please enter a Meteora DLMM URL or Pool ID');
    return;
  }

  const poolId = extractPoolId(poolsStore.urlInput);

  if (!poolId) {
    toast.error('Invalid input', {
      description: 'Please provide a valid Meteora DLMM URL or a 44-character Pool ID',
    });
    poolsStore.selPoolId(null)
    // activePool.selectedPoolId.value = null;
    return;
  }
  poolsStore.selPoolId(poolId)
  // activePool.selectedPoolId.value = poolId;
}

// Extract pool ID from Meteora DLMM URL or direct pool ID
function extractPoolId(input: string): string | null {
  try {
    const trimmedInput = input.trim();

    // Check if input is a direct pool ID (44 characters, alphanumeric)
    if (/^[A-Za-z0-9]{44}$/.test(trimmedInput)) {
      return trimmedInput;
    }

    // Otherwise, try to extract from URL pattern: dlmm/{id}
    const match = trimmedInput.match(/dlmm\/([A-Za-z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch (error) {
    return null;
  }
}


const createNewWallet = async () => {
  try {
    const { publicKey, signMessage } = useWallet();
    if (!publicKey.value || !signMessage?.value) {
      throw new Error('Wallet connection failed');
    }

    const address = publicKey.value.toBase58();
    const nonceResponse = await apiClient.openApi.auth.authNoncePost({authNonceBody: {address}})

    if (!nonceResponse.ok) {
      throw new Error('Failed to get nonce');
    }

    const message = nonceResponse.data.message;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = await signMessage.value(messageBytes);
    const signatureBase58 = bs58.encode(signatureBytes);


    const request = await apiClient.openApi.users.usersCreateNewWalletPost({'authVerifyBody': {address, signature: signatureBase58}})
    
    authStore.internalWallet = request
  } catch (err) {
    toast.error('Unexpected error, try again later.')
  }
}
</script>
<template>
  <NotificationsSidebar/>
  <PrivateKey
    v-if="showPrivateKeyModal"
    :open="true"
    @update:open="(val:boolean) => showPrivateKeyModal = val"
  />

  <div class="header relative w-full px-4 py-4 lg:px-8">
    <!-- Mobile: Two rows (logo/wallet, then input) -->
    <!-- Desktop: Single row (logo, input, wallet) -->
    <div class="flex flex-col lg:flex-row gap-4 lg:gap-2 lg:items-center lg:justify-between">
      <!-- Mobile: First row with logo and wallet -->
      <div class="flex items-center justify-between gap-2 lg:hidden">
        <img
          src="/logos/logo-dark.png"
          class="h-8 w-fit cursor-pointer hover:opacity-80 transition-opacity shrink-0"
          @click="poolsStore.selPoolId(null); poolsStore.setUrlInput(null);"
        />
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Card class="!px-3 !py-2 cursor-pointer hover:bg-accent transition-colors shrink-0">
              <div class="space-y-1">
                <div class="text-sm font-medium">
                  {{ useBalanceStore().balance !== null ? useBalanceStore().balance?.toFixed(3) : '...' }} SOL
                </div>
                <div v-if="walletAddress" class="text-xs text-muted-foreground">
                  {{ walletAddress }}
                </div>
              </div>
            </Card>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem @click="copyInternalWallet">
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Copy Internal Wallet</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem @click="getBalance()">
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh Balance</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleConfig">
              <span>Config</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="showPrivateKeyModal = true">
              <span>Get Private Key</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="createNewWallet()">
              <span>Create new wallet</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-red-500" @click="authStore.signOut()">
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Desktop: Logo (shown only on large screens) -->
      <img
        src="/logos/logo-dark.png"
        class="hidden lg:block h-8 w-fit cursor-pointer hover:opacity-80 transition-opacity shrink-0"
        @click="poolsStore.selPoolId(null); poolsStore.setUrlInput(null);"
      />

      <!-- Input field (full width on mobile, centered with max-width on desktop) -->
      <Card class="!p-4 lg:w-[800px] ml-auto mr-auto">
        <div class="space-y-2">
          <label class="text-sm font-medium text-muted-foreground">
            <span class="hidden lg:inline">Enter Meteora DLMM URL or Pool ID</span>
            <span class="lg:hidden">Pool URL or ID</span>
          </label>
          <Input
            v-model="urlInput"
            type="text"
            placeholder="8ztFxjFPfVUtEf4SLSapcFj8GW2dxyUA9no2bLPq7H7V or https://www.meteora.ag/dlmm/8ztFxjFPfVUtEf4SLSapcFj8GW2dxyUA9no2bLPq7H7V"
            class="w-full"
            @keyup.enter="handleUrlSubmit"
            @paste="handlePaste"
          />
          <div v-if="poolsStore.selectedPoolId" class="flex items-center gap-2 mt-2">
            <span class="text-xs text-green-500">✓ Pool ID:</span>
            <code class="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1 min-w-0 block">
              {{ poolsStore.selectedPoolId }}
            </code>
          </div>
        </div>
      </Card>

      <!-- Desktop: Wallet (shown only on large screens) -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Card class="hidden lg:block w-fit !px-4 !py-3 cursor-pointer hover:bg-accent transition-colors shrink-0">
            <div class="space-y-1">
              <div class="text-sm font-medium">
                Balance: {{ useBalanceStore().balance !== null ? useBalanceStore().balance?.toFixed(3) : '...' }} SOL
              </div>
              <div v-if="walletAddress" class="text-xs text-muted-foreground">
                {{ walletAddress }}
              </div>
            </div>
          </Card>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem @click="copyInternalWallet">
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy Internal Wallet</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem @click="getBalance()">
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh Balance</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleConfig">
            <span>Config</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="showPrivateKeyModal = true">
            <span>Get Private Key</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="createNewWallet()">
            <span>Create new wallet</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-red-500" @click="authStore.signOut();">
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        class="h-[46px] w-[46px] flex align-center justify-center rounded-full bg-card text-card-foreground flex-col gap-4 rounded-xl border shadow-sm hidden lg:block w-fit cursor-pointer hover:bg-accent transition-colors shrink-0"
        @click="useNotifications().toggleOpen()"
      >
        <component :is="useNotifications().unreadNotifications.value ? BellDot : Bell" :color="useNotifications().unreadNotifications.value ? '#c18aff' : '#fff'" />
      </Button>
    </div>
  </div>
</template>