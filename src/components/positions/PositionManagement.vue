<script setup lang="ts">
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';

import { apiClient, type Position, type UpdatePositionRequest, type ClaimFeesRequest, type RebalancePositionRequest } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Separator from '@/components/ui/separator/Separator.vue';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  position: Position;
  poolInfo?: {
    name: string;
    current_price: number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  closed: []
  updated: [position: Position]
}>();

// State
const isEditMode = ref(false);
const isLoading = ref(false);

// Edit form fields
const editTakeProfitPrice = ref<string>('');
const editStopLossPrice = ref<string>('');
const editAutoRebalance = ref(false);
const editRebalanceStrategy = ref<'spot' | 'curve' | 'bidAsk' | ''>('');
const editStopRebalanceMinPrice = ref<string>('');
const editStopRebalanceMaxPrice = ref<string>('');
const editAutoTakeFees = ref(false);
const editFeesInterval = ref<number>(1);
const editFeeMode = ref<'simple' | 'sellIntoSol' | 'reinvest'>('simple');

// Initialize edit form with current position data
function initializeEditForm() {
  if (props.position.takeProfitConfig) {
    editTakeProfitPrice.value = props.position.takeProfitConfig.takeProfitPrice || '';
    editStopLossPrice.value = props.position.takeProfitConfig.stopLossPrice || '';
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
    editFeeModeReinvestStrategy.value = props.position.feesConfig.reinvestStrategy
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
    const updateData: UpdatePositionRequest = {};

    // Take profit config
    if (editTakeProfitPrice.value || editStopLossPrice.value) {
      updateData.takeProfitConfig = {
        takeProfitPrice: String(editTakeProfitPrice.value),
        stopLossPrice: String(editStopLossPrice.value),
      };
    } else {
      updateData.takeProfitConfig = null;
    }

    // Rebalance config
    if (editAutoRebalance.value && editRebalanceStrategy.value) {
      updateData.rebalanceConfig = {
        strategy: editRebalanceStrategy.value,
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

    const response = await apiClient.updatePosition(props.position.id, updateData);

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
const showRebalanceModal = ref(false);
const rebalanceStrategy = ref<'spot' | 'curve' | 'bidAsk' | ''>('');

async function handleManualRebalance() {
  if (!rebalanceStrategy.value) {
    toast.error('Please select a rebalance strategy');
    return;
  }

  isLoading.value = true;
  try {
    const response = await apiClient.rebalancePosition(props.position.id, {
      strategyType: rebalanceStrategy.value,
    });

    toast.success('Rebalance request submitted', {
      description: `Strategy: ${response.data.requestedStrategy}`,
    });
    showRebalanceModal.value = false;
    rebalanceStrategy.value = '';
  } catch (error: any) {
    toast.error('Failed to rebalance position', {
      description: error.message || 'Unknown error',
    });
  } finally {
    isLoading.value = false;
  }
}

// Claim fees state
const showClaimFeesModal = ref(false);
const claimFeesAction = ref<'simple' | 'addLiquidity' | 'swap'>('simple');
const claimFeesStrategy = ref<'spot' | 'curve' | 'bidAsk' | ''>('');
const editFeeModeReinvestStrategy = ref<'spot' | 'curve' | 'bidAsk'>('spot');
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
const tokenName = computed(() => {
  if (!props.poolInfo?.name) return 'TOKEN';
  const parts = props.poolInfo.name.split('-');
  return parts[0] || 'TOKEN';
});
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
            <p class="text-sm">{{ position.takeProfitConfig.takeProfitPrice || 'Not set' }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Stop Loss Price</p>
            <p class="text-sm">{{ position.takeProfitConfig.stopLossPrice || 'Not set' }}</p>
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
        <Button variant="outline" :disabled="isLoading" @click="showRebalanceModal = true">
          Manual Rebalance
        </Button>
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
        <Label>Take Profit / Stop Loss Prices</Label>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-sm">Take Profit Price</Label>
            <Input
              v-model="editTakeProfitPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div class="space-y-2">
            <Label class="text-sm">Stop Loss Price</Label>
            <Input
              v-model="editStopLossPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
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
            <Label>Rebalance Strategy</Label>
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
    <div v-if="showRebalanceModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
    </div>

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
