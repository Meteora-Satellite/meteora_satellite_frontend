<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';

import { apiClient, type ClaimFeesRequest } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Separator from '@/components/ui/separator/Separator.vue';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RebalanceConfigStrategyEnum, RebalanceConfigTypeEnum, type FeesConfigReinvestStrategyEnum, type PositionDTO, type PositionOnchainDataSchema, type PositionsPositionIdPatchOperationRequest, type PositionsPositionIdPatchRequest } from '@/api';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui';
import PositionFullInfo from './PositionFullInfo.vue';
import { useWSClientStore } from '@/stores/ws';

interface Props {
  position: PositionDTO;
  poolInfo?: {
    name: string;
    current_price: number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  closed: []
  updated: [position: PositionDTO],
  onChainUpdated: [PositionOnchainDataSchema]
}>();

// State
const isEditMode = ref(false);
const isLoading = ref(false);

// Edit form fields
const editTakeProfitPrice = ref<string>('');
const editTakeProfitOutOfRange = ref<boolean>(false);
const editStopLossPrice = ref<string>('');
const editStopLossOutOfRange = ref<boolean>(false);
const editPriceCurrency = ref<'usd' | 'sol'>('sol');
const editAutoRebalance = ref(false);
const editRebalanceStrategy = ref<RebalanceConfigStrategyEnum>('bidAsk');
const editRebalanceType = ref<RebalanceConfigTypeEnum>('standard')
const editStopRebalanceMinPrice = ref<string>('');
const editStopRebalanceMaxPrice = ref<string>('');
const editAutoTakeFees = ref(false);
const editFeesInterval = ref<number>(1);
const editFeeMode = ref<'simple' | 'sellIntoSol' | 'reinvest'>('simple');

const editFeeModeReinvestStrategy = ref<FeesConfigReinvestStrategyEnum>('spot');
// Initialize edit form with current position data
function initializeEditForm() {
  if (props.position.takeProfitConfig) {
    if (props.position.takeProfitConfig.outOfRange) {
      editTakeProfitOutOfRange.value = props.position.takeProfitConfig.outOfRange;
    } else if (props.position.takeProfitConfig.price || props.position.takeProfitConfig.priceUsd) {
      editTakeProfitPrice.value = props.position.takeProfitConfig?.price ?? props.position.takeProfitConfig?.priceUsd ?? '';

      if (props.position.takeProfitConfig.priceUsd) editPriceCurrency.value = 'usd'
    }
  }


  if (props.position.stopLossConfig) {
    if (props.position.stopLossConfig.outOfRange) {
      editStopLossOutOfRange.value = props.position.stopLossConfig.outOfRange;
    } else if (props.position.stopLossConfig.price || props.position.stopLossConfig.priceUsd) {
      editStopLossPrice.value = props.position.stopLossConfig?.price ?? props.position.stopLossConfig?.priceUsd ?? '';

      if (props.position.stopLossConfig.priceUsd) editPriceCurrency.value = 'usd'
    }
  }

  if (props.position.rebalanceConfig) {
    editAutoRebalance.value = true;
    editRebalanceStrategy.value = props.position.rebalanceConfig.strategy;
    editStopRebalanceMinPrice.value = props.position.rebalanceConfig.stopRebalanceMinimumPrice || '';
    editStopRebalanceMaxPrice.value = props.position.rebalanceConfig.stopRebalanceMaximumPrice || '';
  }

  if (props.position.feesConfig) {
    editAutoTakeFees.value = true;
    editFeesInterval.value = props.position.feesConfig.interval;
    editFeeMode.value = props.position.feesConfig.mode;
    editFeeModeReinvestStrategy.value = props.position.feesConfig?.reinvestStrategy || 'spot'
  }
}

// Toggle edit mode
function toggleEditMode() {
  if (!isEditMode.value) {
    initializeEditForm();
  }
  isEditMode.value = !isEditMode.value;
}

// Update position config
async function handleUpdateConfig() {
  isLoading.value = true;
  try {
    const updateData: PositionsPositionIdPatchRequest = {};

    // Take profit config
    const keyCurrency = editPriceCurrency.value === 'sol' ? 'price' : 'priceUsd';
    if (editTakeProfitPrice.value && !editTakeProfitOutOfRange.value) {
      updateData.takeProfitConfig = {
        [keyCurrency]: String(editTakeProfitPrice.value) || ''
      }
    } else if (editStopLossOutOfRange.value) {
      updateData.takeProfitConfig ??= {}
      updateData.takeProfitConfig.outOfRange = editTakeProfitOutOfRange.value
    } else {
      updateData.takeProfitConfig = null
    }

    if (editStopLossPrice.value && !editStopLossOutOfRange.value) {
      updateData.stopLossConfig = {
        [keyCurrency]: String(editStopLossPrice.value) || ''
      }
    } else if (editStopLossOutOfRange.value) {
      updateData.stopLossConfig ??= {}
      updateData.stopLossConfig.outOfRange = editStopLossOutOfRange.value
    } else {
      updateData.stopLossConfig = null
    }
    // Rebalance config
    if (editAutoRebalance.value && editRebalanceStrategy.value) {
      updateData.rebalanceConfig = {
        strategy: editRebalanceStrategy.value,
        type: editRebalanceType.value,
        stopRebalanceMinimumPrice: editStopRebalanceMinPrice.value ? String(editStopRebalanceMinPrice.value) : undefined,
        stopRebalanceMaximumPrice: editStopRebalanceMaxPrice.value ? String(editStopRebalanceMaxPrice.value) : undefined,
      };
    } else {
      updateData.rebalanceConfig = null;
    }

    // Fees config
    if (editAutoTakeFees.value) {
      updateData.feesConfig = {
        interval: editFeesInterval.value,
        mode: editFeeMode.value,
        reinvestStrategy: editFeeModeReinvestStrategy.value
      };
    } else {
      updateData.feesConfig = null;
    }
    const data:PositionsPositionIdPatchOperationRequest = {positionId: props.position.id, positionsPositionIdPatchRequest: updateData}
    const response = await apiClient.openApi.positions.positionsPositionIdPatch(data);

    toast.success('Position updated successfully');
    isEditMode.value = false;

    // Emit the updated position data from the server response
    if (response.ok && response.data) {
      emit('updated', response.data);
    } else {
      // Fallback to current position if no data in response
      emit('updated', props.position);
    }
  } catch (error: any) {
    toast.error('Failed to update position', {
      description: error.message || 'Unknown error',
    });
  } finally {
    isLoading.value = false;
  }
}

// Manual rebalance state
// const showRebalanceModal = ref(false);
// const rebalanceStrategy = ref<'spot' | 'curve' | 'bidAsk' | ''>('');

// async function handleManualRebalance() {
//   if (!rebalanceStrategy.value) {
//     toast.error('Please select a rebalance strategy');
//     return;
//   }

//   isLoading.value = true;
//   try {
//     const response = await apiClient.rebalancePosition(props.position.id, {
//       strategyType: rebalanceStrategy.value,
//     });

//     toast.success('Rebalance request submitted', {
//       description: `Strategy: ${response.data.requestedStrategy}`,
//     });
//     showRebalanceModal.value = false;
//     rebalanceStrategy.value = '';
//   } catch (error: any) {
//     toast.error('Failed to rebalance position', {
//       description: error.message || 'Unknown error',
//     });
//   } finally {
//     isLoading.value = false;
//   }
// }

// Claim fees state
const showClaimFeesModal = ref(false);
const claimFeesAction = ref<'simple' | 'addLiquidity' | 'swap'>('simple');
const claimFeesStrategy = ref<'spot' | 'curve' | 'bidAsk' | ''>('');
async function handleClaimFees() {
  isLoading.value = true;
  try {
    const requestData: ClaimFeesRequest = {
      addLiquidity: claimFeesAction.value === 'addLiquidity',
      swap: claimFeesAction.value === 'swap',
    };

    if (claimFeesAction.value === 'addLiquidity' && claimFeesStrategy.value) {
      requestData.strategyType = claimFeesStrategy.value;
    }

    const response = await apiClient.claimFees(props.position.id, requestData);

    // Show success message with action if available
    if (response.data.action) {
      toast.success('Fees claimed successfully', {
        description: `Action: ${response.data.action}`,
      });
    } else {
      toast.success('Fees claimed successfully');
    }

    showClaimFeesModal.value = false;
    claimFeesAction.value = 'simple';
    claimFeesStrategy.value = '';
  } catch (error: any) {
    toast.error('Failed to claim fees', {
      description: error.message || 'Unknown error',
    });
  } finally {
    isLoading.value = false;
  }
}

// Close position
const showCloseConfirmation = ref(false);

async function handleClosePosition() {
  isLoading.value = true;
  try {
    await apiClient.closePosition(props.position.id);

    toast.success('Position closed successfully');
    showCloseConfirmation.value = false;
    emit('closed');
  } catch (error: any) {
    toast.error('Failed to close position', {
      description: error.message || 'Unknown error',
    });
  } finally {
    isLoading.value = false;
  }
}

// Extract token name
// const tokenName = computed(() => {
//   if (!props.poolInfo?.name) return 'TOKEN';
//   const parts = props.poolInfo.name.split('-');
//   return parts[0] || 'TOKEN';
// });

const tpValue = computed(() => {
  const data = props.position.takeProfitConfig;

  if (data?.outOfRange) return 'Out of range';

  if (data?.price && data.price.trim() !== '') {
    return data.price;
  }

  if (data?.priceUsd && data.priceUsd.trim() !== '') {
    return '$' + data.priceUsd;
  }
});

const slValue = computed(() => {
  const data = props.position.stopLossConfig;

  if (data?.outOfRange) return 'Out of range';

  if (data?.price && data.price.trim() !== '') {
    return data.price;
  }

  if (data?.priceUsd && data.priceUsd.trim() !== '') {
    return '$' + data.priceUsd;
  }

  return 'Not set';
});

onMounted(() => {
  const {wsClient} = useWSClientStore()
  if (wsClient && props.position.id) {
    wsClient.subscribeOnPositionUpdate(props.position.id, (val: PositionOnchainDataSchema) => {
      emit('onChainUpdated', val)
    })
  }
})

onUnmounted(() => {
  const {wsClient} = useWSClientStore()
  if (wsClient && props.position.id) {
    wsClient.unsubscribeFromPositionUpdate(props.position.id)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Position Details Header -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">Active Position</h3>
        <div class="flex gap-2">
          <span class="px-3 py-1 text-sm bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
            Active
          </span>
          <span class="px-3 py-1 text-sm bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20">
            {{ position.strategyType.toUpperCase() }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Position ID</p>
          <code class="text-xs bg-muted px-2 py-1 rounded">{{ position.id }}</code>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">SOL Amount</p>
          <p class="text-base font-medium">{{ position.solAmount }} SOL</p>
        </div>
      </div>
      <Separator />
      <PositionFullInfo
        :position="position"
      />
    </div>

    <Separator />

    <!-- Edit Mode / Display Mode -->
    <div v-if="!isEditMode" class="space-y-4">
      <!-- Take Profit / Stop Loss Config -->
      <div v-if="position.takeProfitConfig" class="space-y-2">
        <h4 class="text-sm font-medium text-white">Take Profit / Stop Loss</h4>
        <div class="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
          <div>
            <p class="text-xs text-muted-foreground">Take Profit Price</p>
            <p class="text-sm">{{ tpValue }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Stop Loss Price</p>
            <p class="text-sm">{{ slValue }}</p>
          </div>
        </div>
      </div>

      <!-- Rebalance Config -->
      <div v-if="position.rebalanceConfig" class="space-y-2">
        <h4 class="text-sm font-medium text-white">Auto Rebalance Settings</h4>
        <div class="p-4 bg-muted/30 rounded-md space-y-2">
          <div>
            <p class="text-xs text-muted-foreground">Strategy</p>
            <p class="text-sm">{{ position.rebalanceConfig.strategy.toUpperCase() }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted-foreground">Min Price</p>
              <p class="text-sm">{{ position.rebalanceConfig.stopRebalanceMinimumPrice || 'Not set' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Max Price</p>
              <p class="text-sm">{{ position.rebalanceConfig.stopRebalanceMaximumPrice || 'Not set' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Fees Config -->
      <div v-if="position.feesConfig" class="space-y-2">
        <h4 class="text-sm font-medium text-white">Auto Fees Settings</h4>
        <div class="p-4 bg-muted/30 rounded-md space-y-2">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted-foreground">Interval</p>
              <p class="text-sm">{{ position.feesConfig.interval }} minutes</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Mode</p>
              <p class="text-sm">{{ position.feesConfig.mode }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex-wrap flex gap-3 pt-4">
        <Button variant="outline" :disabled="isLoading" @click="toggleEditMode">
          Update Config
        </Button>
        <!-- <Button variant="outline" :disabled="isLoading" @click="showRebalanceModal = true">
          Manual Rebalance
        </Button> -->
        <Button variant="outline" :disabled="isLoading" @click="showClaimFeesModal = true">
          Claim Fees
        </Button>
        <Button variant="destructive" :disabled="isLoading" @click="showCloseConfirmation = true">
          Close Position
        </Button>
      </div>
    </div>

    <!-- Edit Mode Form -->
    <div v-else class="space-y-4">
      <h4 class="text-base font-semibold text-white">Edit Position Configuration</h4>

      <!-- Take Profit / Stop Loss -->
      <div class="space-y-2">
        <Label
          class="block"
        >
          Take Profit / Stop Loss Prices
          <RadioGroupRoot
            v-model="editPriceCurrency"
            class="flex mt-2 gap-4.5 w-[100%]"
            default-value="default"
            aria-label="View density"
          >
            <div class="flex items-center">
              <RadioGroupItem
                id="c1"
                class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
                value="sol"
              >
                <RadioGroupIndicator
                  class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
                />
              </RadioGroupItem>
              <label
                class="text-stone-700 dark:text-white text-sm leading-none pl-[5px] flex items-center"
                for="c1"
              >
                SOL
              </label>
            </div>
            <div class="flex items-center">
              <RadioGroupItem
                id="c2"
                class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
                value="usd"
              >
                <RadioGroupIndicator
                  class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
                />
              </RadioGroupItem>
              <label
                class="text-stone-700 dark:text-white text-sm leading-none pl-[5px] flex items-center"
                for="c2"
              >
                USD
              </label>
            </div>
          </RadioGroupRoot>
        </Label>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-sm block">
              Take Profit Price
            </Label>
            <label for="a1" class="flex items-center align-center text-sm">
              Out of Range
              <Checkbox
                id="a1"
                v-model="editTakeProfitOutOfRange"
                class="ml-2"
              />
            </label>
            <Input
              v-model="editTakeProfitPrice"
              type="number"
              step="0.01"
              :disabled="editTakeProfitOutOfRange"
              :placeholder="editPriceCurrency === 'usd' ? '$ 0.00' : '0.00'"
            />
          </div>
          <div class="space-y-2">
            <Label class="text-sm">Stop Loss Price</Label>
            <label for="a2" class="flex items-center align-center text-sm">
              Out of Range
              <Checkbox
                id="a2"
                v-model="editStopLossOutOfRange"
                class="ml-2"
              />
            </label>
            <Input
              v-model="editStopLossPrice"
              type="number"
              step="0.01"
              :disabled="editStopLossOutOfRange"
              :placeholder="editPriceCurrency === 'usd' ? '$ 0.00' : '0.00'"
            />
          </div>
        </div>
      </div>

      <Separator />

      <!-- Rebalance Settings -->
      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <Checkbox id="editAutoRebalance" v-model="editAutoRebalance" />
          <Label for="editAutoRebalance" class="cursor-pointer">
            Auto Rebalance when exiting liquidity range
          </Label>
        </div>

        <div v-if="editAutoRebalance" class="ml-6 space-y-4 border-l-2 border-zinc-700 pl-4">
          <div class="space-y-2">
            <div class="flex items-start">
              <div class="mr-5">
                <label class="text-sm font-medium">Rebalance Strategy</label>
                <Select v-model="editRebalanceStrategy">
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="spot">SPOT</SelectItem>
                      <SelectItem value="curve">CURVE</SelectItem>
                      <SelectItem value="bidAsk">BIDASK</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label class="text-sm font-medium mb-5">Rebalance Type</label>
                <RadioGroupRoot
                  v-model="editRebalanceType"
                  class="flex mt-2 gap-4.5"
                  default-value="default"
                  aria-label="View density"
                >
                  <div class="flex items-center">
                    <RadioGroupItem
                      id="r1"
                      class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
                      value="standard"
                    >
                      <RadioGroupIndicator
                        class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
                      />
                    </RadioGroupItem>
                    <label
                      class="text-stone-700 dark:text-white text-sm leading-none pl-[5px]"
                      for="r1"
                    >
                      Standard(reopen)
                    </label>
                  </div>
                  <div class="flex items-center">
                    <RadioGroupItem
                      id="r2"
                      class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
                      value="simple"
                    >
                      <RadioGroupIndicator
                        class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
                      />
                    </RadioGroupItem>
                    <label
                      class="text-stone-700 dark:text-white text-sm leading-none pl-[5px]"
                      for="r2"
                    >
                      Simple(no swap)
                    </label>
                  </div>
                </RadioGroupRoot>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-sm">Stop Loss Rebalance Price</Label>
              <Input
                v-model="editStopRebalanceMinPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm">Take Profit Rebalance Price</Label>
              <Input
                v-model="editStopRebalanceMaxPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Fees Settings -->
      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <Checkbox id="editAutoTakeFees" v-model="editAutoTakeFees" />
          <Label for="editAutoTakeFees" class="cursor-pointer">
            Auto take fees
          </Label>
        </div>

        <div v-if="editAutoTakeFees" class="ml-6 space-y-4 border-l-2 border-zinc-700 pl-4">
          <div class="space-y-2">
            <Label>Fees taking interval (minutes)</Label>
            <Input
              v-model="editFeesInterval"
              type="number"
              min="1"
              placeholder="1"
            />
          </div>

          <div class="space-y-2">
            <Label>Fee Collection Mode</Label>
            <Select v-model="editFeeMode">
              <SelectTrigger>
                <SelectValue placeholder="Select fee mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="sellIntoSol">Sell Into SOL</SelectItem>
                  <SelectItem value="reinvest">Reinvest</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>


          <!-- Fees Reinvest Strategy (shown when feeMode is reinvest) -->
          <div v-if="editFeeMode === 'reinvest'" class="space-y-2">
            <label class="text-sm font-medium">Fees Reinvesting Strategy</label>
            <Select v-model="editFeeModeReinvestStrategy">
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="spot">SPOT</SelectItem>
                  <SelectItem value="curve">CURVE</SelectItem>
                  <SelectItem value="bidAsk">BIDASK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Edit Actions -->
      <div class="flex gap-3 pt-4">
        <Button :disabled="isLoading" @click="handleUpdateConfig">
          {{ isLoading ? 'Saving...' : 'Save Changes' }}
        </Button>
        <Button variant="outline" :disabled="isLoading" @click="toggleEditMode">
          Cancel
        </Button>
      </div>
    </div>

    <!-- Manual Rebalance Modal -->
    <!-- <div v-if="showRebalanceModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card class="w-full max-w-md !p-6">
        <CardHeader>
          <h3 class="text-lg font-semibold">Manual Rebalance</h3>
          <p class="text-sm text-muted-foreground">Select a strategy for rebalancing</p>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Strategy</Label>
            <Select v-model="rebalanceStrategy">
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="spot">SPOT</SelectItem>
                  <SelectItem value="curve">CURVE</SelectItem>
                  <SelectItem value="bidAsk">BIDASK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="flex gap-3 pt-4">
            <Button :disabled="isLoading || !rebalanceStrategy" @click="handleManualRebalance">
              {{ isLoading ? 'Processing...' : 'Rebalance' }}
            </Button>
            <Button variant="outline" :disabled="isLoading" @click="showRebalanceModal = false; rebalanceStrategy = ''">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div> -->

    <!-- Claim Fees Modal -->
    <div v-if="showClaimFeesModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card class="w-full max-w-md !p-6">
        <CardHeader>
          <h3 class="text-lg font-semibold">Claim Fees</h3>
          <p class="text-sm text-muted-foreground">Choose how to handle claimed fees</p>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Action</Label>
            <Select v-model="claimFeesAction">
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="addLiquidity">Add Liquidity</SelectItem>
                  <SelectItem value="swap">Swap</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div v-if="claimFeesAction === 'addLiquidity'" class="space-y-2">
            <Label>Strategy (for Add Liquidity)</Label>
            <Select v-model="claimFeesStrategy">
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="spot">SPOT</SelectItem>
                  <SelectItem value="curve">CURVE</SelectItem>
                  <SelectItem value="bidAsk">BIDASK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="flex gap-3 pt-4">
            <Button :disabled="isLoading || (claimFeesAction === 'addLiquidity' && !claimFeesStrategy)" @click="handleClaimFees">
              {{ isLoading ? 'Processing...' : 'Claim Fees' }}
            </Button>
            <Button variant="outline" :disabled="isLoading" @click="showClaimFeesModal = false; claimFeesAction = 'simple'; claimFeesStrategy = ''">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Close Confirmation Modal -->
    <div v-if="showCloseConfirmation" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card class="w-full max-w-md !p-6">
        <CardHeader>
          <h3 class="text-lg font-semibold text-red-500">Close Position</h3>
          <p class="text-sm text-muted-foreground">
            Are you sure you want to close this position? This action will remove all liquidity and claim fees.
          </p>
        </CardHeader>
        <CardContent>
          <div class="flex gap-3 pt-4">
            <Button variant="destructive" :disabled="isLoading" @click="handleClosePosition">
              {{ isLoading ? 'Closing...' : 'Yes, Close Position' }}
            </Button>
            <Button variant="outline" :disabled="isLoading" @click="showCloseConfirmation = false">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
