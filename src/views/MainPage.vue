<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';

import Card from '@/components/ui/card/Card.vue';
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
import { useBalanceStore } from '@/stores/balance';

const authStore = useAuthStore();
const poolsStore = usePoolsStore();
const positionsStore = usePositionsStore();

const {balance, getBalance} = useBalanceStore()

// const urlInput = ref('');
// const selectedPoolId = ref<string | null>(null);
// const realBalance = ref<number | null>(null);
const positionFormRef = ref<InstanceType<typeof PositionForm> | null>(null);
const openedPosition = ref<Position | null>(null);
const isSubmittingPosition = ref(false);
const isLoadingPosition = ref(false);

// Store pool names for position cards
const poolNames = ref<Record<string, string>>({});



// Fetch balance and internal wallet on component mount
onMounted(async () => {
  if (authStore.isAuthenticated) {
    // Fetch internal wallet if not already loaded
    // if (!authStore.internalWallet) {
    //   await authStore.getInternalWallet();
    // }
    // Fetch balance
    // await fetchBalance();

    // Load pool names for positions
    await loadPoolNames();

  }
});





watch(() => usePoolsStore().selectedPoolId, async (newValue) => {
  console.log('new pool id')
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
      await getBalance();
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
  getBalance();
}

// Handle position updated event
function handlePositionUpdated(updatedPosition: Position) {
  // Update the UI with the fresh position data from the server
  openedPosition.value = updatedPosition;
  // Update in positions store as well
  positionsStore.updatePosition(updatedPosition.id, updatedPosition);
  // Refresh balance after updating position
  getBalance();
}

// Handle position card click
async function handlePositionCardClick(position: Position) {
  // Set the pool ID to load that position
  poolsStore.setUrlInput(position.poolId);
  poolsStore.selPoolId(position.poolId);
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

    <div class="flex flex-col justify-start items-center overflow-y-auto pt-6">
      <!-- Positions List Section -->
      <div v-if="positionsStore.hasPositions && !poolsStore.selectedPoolId" class="w-full lg:px-40 mb-8">
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

      <div v-if="poolsStore.selectedPoolId" class="h-full w-full p-10 lg:px-40">
        <Card class="!p-6 bg-card/20 backdrop-blur-xs w-full h-full min-w-0">
          <CardHeader class="w-full min-w-0">
            <h2 class="text-lg font-semibold mb-2">Selected Pool <i v-if="poolsStore.selectedPoolInfo" class="text-sattelite-light/50">({{ poolsStore.selectedPoolInfo.name }})</i></h2>
            <div class="text-sm text-muted-foreground flex items-center gap-2 w-full min-w-0">
              <span class="shrink-0">Pool ID:</span>
              <code class="bg-muted px-2 py-1 rounded truncate flex-1 min-w-0 block">{{ poolsStore.selectedPoolId }}</code>
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
                  :pool-id="poolsStore.selectedPoolId!"
                  :max-amount="balance ?? undefined"
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

          <CardFooter v-if="poolsStore.selectedPoolId && poolsStore.selectedPoolInfo && !openedPosition && !isLoadingPosition" class="flex justify-end pt-4">
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
