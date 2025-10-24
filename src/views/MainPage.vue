<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import Card from '@/components/ui/card/Card.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HyperText from '@/components/ui/hyper-text/HyperText.vue';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { usePoolsStore } from '@/stores/pools';
import { usePositionsStore } from '@/stores/positions';
import CardHeader from '@/components/ui/card/CardHeader.vue';
import CardContent from '@/components/ui/card/CardContent.vue';
import CardFooter from '@/components/ui/card/CardFooter.vue';
import { Button } from '@/components/ui/button';
import PositionForm from '@/components/positions/PositionForm.vue';
import PositionManagement from '@/components/positions/PositionManagement.vue';
import PositionCard from '@/components/positions/PositionCard.vue';
import { apiClient, type Position } from '@/services/api';
import { getPoolInformation } from '@/services/meteora';

const router = useRouter();
const authStore = useAuthStore();
const poolsStore = usePoolsStore();
const positionsStore = usePositionsStore();

const urlInput = ref('');
const selectedPoolId = ref<string | null>(null);
const realBalance = ref<number | null>(null);
const positionFormRef = ref<InstanceType<typeof PositionForm> | null>(null);
const openedPosition = ref<Position | null>(null);
const isSubmittingPosition = ref(false);
const isLoadingPosition = ref(false);

// Store pool names for position cards
const poolNames = ref<Record<string, string>>({});

// Fetch wallet balance from API
async function fetchBalance() {
  try {
    const response = await apiClient.getWalletBalances();
    if (response.ok) {
      realBalance.value = parseFloat(response.data.solana);
    }
  } catch (error) {
    toast.error('Failed to fetch balance');
  }
}

// Computed internal wallet address for display
const walletAddress = computed(() => {
  if (!authStore.internalWallet?.data?.address) return null;
  const addr = authStore.internalWallet.data.address;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
});

// Balance refresh interval
let balanceRefreshInterval: number | null = null;

// Fetch balance and internal wallet on component mount
onMounted(async () => {
  if (authStore.isAuthenticated) {
    // Fetch internal wallet if not already loaded
    if (!authStore.internalWallet) {
      await authStore.getInternalWallet();
    }
    // Fetch balance
    await fetchBalance();

    // Load pool names for positions
    await loadPoolNames();

    // Set up 10-second interval for balance updates
    balanceRefreshInterval = window.setInterval(() => {
      fetchBalance();
    }, 10000); // 10 seconds
  }
});

// Clean up interval on component unmount
onUnmounted(() => {
  if (balanceRefreshInterval !== null) {
    clearInterval(balanceRefreshInterval);
  }
});

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

// Handle URL input (on Enter key or paste)
function handleUrlSubmit() {
  if (!urlInput.value.trim()) {
    toast.error('Please enter a Meteora DLMM URL or Pool ID');
    return;
  }

  const poolId = extractPoolId(urlInput.value);

  if (!poolId) {
    toast.error('Invalid input', {
      description: 'Please provide a valid Meteora DLMM URL or a 44-character Pool ID',
    });
    selectedPoolId.value = null;
    return;
  }

  selectedPoolId.value = poolId;
}

watch(selectedPoolId, async (newValue) => {
  if (newValue) {
    isLoadingPosition.value = true;
    try {
      // Fetch pool info
      await poolsStore.getSelectedPoolInfo(newValue);

      // Check if there's an existing position for this pool
      const positionsResponse = await apiClient.getPositions(newValue);

      if (positionsResponse.ok && positionsResponse.data.items.length > 0) {
        // Use the first position found for this pool
        const position = positionsResponse.data.items[0];
        if (position) {
          openedPosition.value = position;
          toast.info('Found existing position for this pool', {
            description: `Position ID: ${position.id}`,
          });
        } else {
          openedPosition.value = null;
        }
      } else {
        // No positions found, reset to allow creating new one
        openedPosition.value = null;
      }
    } catch (error: any) {
      // Don't block the user if position check fails
      openedPosition.value = null;

      // Show specific error message
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error('Failed to load pool information', {
        description: errorMessage,
      });
    } finally {
      isLoadingPosition.value = false;
    }
  }
})

// Handle paste event
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text');
  if (pastedText) {
    urlInput.value = pastedText;
    handleUrlSubmit();
  }
}

// Handle logout
function handleLogout() {
  // Clear balance refresh interval before logout
  if (balanceRefreshInterval !== null) {
    clearInterval(balanceRefreshInterval);
    balanceRefreshInterval = null;
  }
  authStore.signOut();
  router.push('/login');
}

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

// Handle position form submission
function handleOpenPosition() {
  if (positionFormRef.value) {
    positionFormRef.value.handleSubmit(new Event('submit'));
  }
}

// Handle form submit event from PositionForm
async function handlePositionSubmit(payload: any) {
  isSubmittingPosition.value = true;
  try {
    const response = await apiClient.createPosition(payload);

    if (response.ok) {
      openedPosition.value = response.data;
      // Add to positions store
      positionsStore.addPosition(response.data);
      // Load pool name for the new position
      await loadPoolNames();

      toast.success('Position opened successfully', {
        description: `Position ID: ${response.data.id}`,
      });
      // Refresh balance after opening position
      await fetchBalance();
    }
  } catch (error: any) {
    toast.error('Failed to open position', {
      description: error.message || 'Unknown error',
    });
  } finally {
    isSubmittingPosition.value = false;
  }
}

// Handle position closed event
function handlePositionClosed() {
  // Remove from positions store
  if (openedPosition.value) {
    positionsStore.removePosition(openedPosition.value.id);
  }

  openedPosition.value = null;
  toast.info('Position closed', {
    description: 'You can now open a new position',
  });
  // Refresh balance after closing position
  fetchBalance();
}

// Handle position updated event
function handlePositionUpdated(updatedPosition: Position) {
  // Update the UI with the fresh position data from the server
  openedPosition.value = updatedPosition;
  // Update in positions store as well
  positionsStore.updatePosition(updatedPosition.id, updatedPosition);
  // Refresh balance after updating position
  fetchBalance();
}

// Handle position card click
async function handlePositionCardClick(position: Position) {
  // Set the pool ID to load that position
  urlInput.value = position.poolId;
  selectedPoolId.value = position.poolId;
}

// Load pool names for all positions
async function loadPoolNames() {
  for (const position of positionsStore.allPositions) {
    if (!poolNames.value[position.poolId]) {
      try {
        const poolInfo = await getPoolInformation(position.poolId);
        poolNames.value[position.poolId] = poolInfo.name;
      } catch (error) {
        // If we can't fetch pool name, just use pool ID
        poolNames.value[position.poolId] = position.poolId.slice(0, 8) + '...';
      }
    }
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col relative">

    <div class="header relative w-full px-4 py-4 lg:px-8">
      <!-- Mobile: Two rows (logo/wallet, then input) -->
      <!-- Desktop: Single row (logo, input, wallet) -->
      <div class="flex flex-col lg:flex-row gap-4 lg:gap-2 lg:items-center lg:justify-between">
        <!-- Mobile: First row with logo and wallet -->
        <div class="flex items-center justify-between gap-2 lg:hidden">
          <img
            src="/logos/logo-dark.png"
            class="h-8 w-fit cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            @click="selectedPoolId = null; urlInput = ''; openedPosition = null"
          />

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Card class="!px-3 !py-2 cursor-pointer hover:bg-accent transition-colors shrink-0">
                <div class="space-y-1">
                  <div class="text-sm font-medium">
                    {{ realBalance !== null ? realBalance.toFixed(3) : '...' }} SOL
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
              <DropdownMenuItem @click="fetchBalance">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-red-500" @click="handleLogout">
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <!-- Desktop: Logo (shown only on large screens) -->
        <img
          src="/logos/logo-dark.png"
          class="hidden lg:block h-8 w-fit cursor-pointer hover:opacity-80 transition-opacity shrink-0"
          @click="selectedPoolId = null; urlInput = ''; openedPosition = null"
        />

        <!-- Input field (full width on mobile, centered with max-width on desktop) -->
        <Card class="!p-4 lg:w-[800px]">
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
            <div v-if="selectedPoolId" class="flex items-center gap-2 mt-2">
              <span class="text-xs text-green-500">✓ Pool ID:</span>
              <code class="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1 min-w-0 block">
                {{ selectedPoolId }}
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
                  Balance: {{ realBalance !== null ? realBalance.toFixed(3) : '...' }} SOL
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
            <DropdownMenuItem @click="fetchBalance">
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
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-red-500" @click="handleLogout">
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div class="flex flex-col justify-start items-center overflow-y-auto pt-6">
      <!-- Positions List Section -->
      <div v-if="positionsStore.hasPositions && !selectedPoolId" class="w-full lg:px-40 mb-8">
        <Card class="!p-6 bg-card/20 backdrop-blur-xs">
          <CardHeader>
            <h2 class="text-xl font-semibold mb-2">Your Active Positions</h2>
            <p class="text-sm text-muted-foreground">
              Click on a position to view details and manage it
            </p>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-3">
              <PositionCard
                v-for="position in positionsStore.allPositions"
                :key="position.id"
                :position="position"
                :pool-name="poolNames[position.poolId]"
                @click="handlePositionCardClick"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div v-if="selectedPoolId" class="h-full w-full p-10 lg:px-40">
        <Card class="!p-6 bg-card/20 backdrop-blur-xs w-full h-full min-w-0">
          <CardHeader class="w-full min-w-0">
            <h2 class="text-lg font-semibold mb-2">Selected Pool <i v-if="poolsStore.selectedPoolInfo" class="text-sattelite-light/50">({{ poolsStore.selectedPoolInfo.name }})</i></h2>
            <div class="text-sm text-muted-foreground flex items-center gap-2 w-full min-w-0">
              <span class="shrink-0">Pool ID:</span>
              <code class="bg-muted px-2 py-1 rounded truncate flex-1 min-w-0 block">{{ selectedPoolId }}</code>
            </div>
          </CardHeader>

          <CardContent class="overflow-y-auto">
            <div>
              <div
                v-if="poolsStore.selectedPoolInfo"
                class="pool-info-block flex flex-col gap-2 p-4 border border-zinc-700 rounded-md text-sm text-zinc-300 bg-zinc-900 "
              >
                <div>
                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                      <span>Name</span>
                    </div>
                    <span class="text-white">{{ poolsStore.selectedPoolInfo.name }}</span>
                  </div>

                  <div class="flex justify-between items-center gap-2 mb-3 min-w-0">
                    <div class="flex items-center shrink-0">
                      <span>Current Pool Price</span>
                    </div>
                    <span class="text-white truncate min-w-0">{{ poolsStore.selectedPoolInfo.current_price }} {{ poolsStore.selectedPoolInfo.yToken }}</span>
                  </div>

                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                      <span>Bin Step</span>
                    </div>
                    <span class="text-white">{{ poolsStore.selectedPoolInfo.bin_step }}</span>
                  </div>

                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                      <span>Base Fee</span>
                    </div>
                    <span class="text-white">{{ poolsStore.selectedPoolInfo.base_fee_percentage }}%</span>
                  </div>

                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                      <span>Max Fee</span>
                    </div>
                    <span class="text-white">{{ poolsStore.selectedPoolInfo.max_fee_percentage }}%</span>
                  </div>

                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                      <span>24h Fee</span>
                    </div>
                    <span class="text-white">${{ (poolsStore.selectedPoolInfo.fees_24h as number).toFixed(2) }}</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <span>24h Fee / TVL</span>
                    </div>
                    <span class="text-white">{{ (poolsStore.selectedPoolInfo.fee_tvl_ratio.hour_24 as number).toFixed(2) }}%</span>
                  </div>
                </div>
              </div>

              <div
                v-if="poolsStore.selectedPoolInfo"
                class="mt-6"
              >
                <!-- Loading state while checking for existing positions -->
                <div v-if="isLoadingPosition" class="flex items-center justify-center p-8">
                  <div class="flex flex-col items-center gap-3">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
                    <p class="text-sm text-muted-foreground">Checking for existing positions...</p>
                  </div>
                </div>

                <!-- Show PositionForm when no position is open -->
                <PositionForm
                  v-else-if="!openedPosition"
                  ref="positionFormRef"
                  :pool-id="selectedPoolId!"
                  :max-amount="realBalance ?? undefined"
                  :pool-info="{
                    name: poolsStore.selectedPoolInfo.name,
                    current_price: poolsStore.selectedPoolInfo.current_price
                  }"
                  @submit="handlePositionSubmit"
                />

                <!-- Show PositionManagement when a position is open -->
                <PositionManagement
                  v-else
                  :position="openedPosition"
                  :pool-info="{
                    name: poolsStore.selectedPoolInfo.name,
                    current_price: poolsStore.selectedPoolInfo.current_price
                  }"
                  @closed="handlePositionClosed"
                  @updated="handlePositionUpdated"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter v-if="selectedPoolId && poolsStore.selectedPoolInfo && !openedPosition && !isLoadingPosition" class="flex justify-end pt-4">
            <Button size="lg" :disabled="isSubmittingPosition" @click="handleOpenPosition">
              {{ isSubmittingPosition ? 'Opening...' : 'Open Position' }}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div v-else class="flex items-center justify-center h-[500px]">
        <Card class="!p-8 max-w-md text-center">
          <p class="text-muted-foreground">
            Enter a Meteora DLMM URL or Pool ID above to get started
          </p>
        </Card>
      </div>
    </div>
  </div>
</template>
