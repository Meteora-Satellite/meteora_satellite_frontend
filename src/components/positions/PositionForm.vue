<script setup lang="ts">
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import * as z from 'zod';

import Separator from '@/components/ui/separator/Separator.vue';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PoolInfo {
  name: string;
  current_price: number;
}

interface Props {
  poolId: string;
  maxAmount?: number;
  poolInfo?: PoolInfo;
}

const props = defineProps<Props>();

// Expose handleSubmit so parent can call it
const emit = defineEmits<{
  submit: [formData: any]
}>();

// Form fields
const strategy = ref<'SPOT' | 'CURVE' | 'BIDASK' | ''>('');
const solAmount = ref<number | ''>('');
const stopLossPrice = ref<number | ''>('');
const takeProfitPrice = ref<number | ''>('');
const autoRebalance = ref(false);
const rebalanceStrategy = ref<'SPOT' | 'CURVE' | 'BIDASK' | ''>('');
const stopRebalanceMinPrice = ref<number | ''>('');
const stopRebalanceMaxPrice = ref<number | ''>('');
const autoTakeFees = ref(false);
const feesInterval = ref(1);
const feeMode = ref<'simple' | 'sellIntoSol' | 'reinvest'>('simple');
const feesReinvestStrategy = ref<'SPOT' | 'CURVE' | 'BIDASK' | ''>('');

// Extract token name from pool name (e.g., "USELESS-SOL" → "USELESS")
const tokenName = computed(() => {
  if (!props.poolInfo?.name) return 'TOKEN';
  const parts = props.poolInfo.name.split('-');
  return parts[0] || 'TOKEN';
});

// Calculate token amount based on SOL input
// Logic: if user enters X SOL, we swap X/2 SOL to token
// Token amount = (X/2) / current_price
const tokenXAmount = computed(() => {
  const sol = typeof solAmount.value === 'number' ? solAmount.value : 0;
  if (sol <= 0 || !props.poolInfo?.current_price) return 0;

  const halfSol = sol / 2;
  const tokenAmount = halfSol / props.poolInfo.current_price;
  return tokenAmount;
});

// Validation errors
const errors = ref<Record<string, string>>({});

function mapStrategyToBackend(strategy: 'SPOT' | 'CURVE' | 'BIDASK'): 'spot' | 'curve' | 'bidAsk' {
  const strategyMap = {
    'SPOT': 'spot' as const,
    'CURVE': 'curve' as const,
    'BIDASK': 'bidAsk' as const,
  };
  return strategyMap[strategy];
}

// Validation schema (computed to use dynamic maxAmount)
const formSchema = computed(() => {
  const maxSol = props.maxAmount ?? 100;

  return z.object({
    strategy: z.enum(['SPOT', 'CURVE', 'BIDASK'], {
      message: 'Please select a strategy',
    }),
    tokenXAmount: z.number(),
    solAmount: z.number({
      message: 'SOL amount is required',
    })
      .positive('SOL amount must be greater than 0')
      .max(maxSol, `Maximum amount is ${maxSol.toFixed(3)} SOL`),
    stopLossPrice: z.number().positive().optional(),
    takeProfitPrice: z.number().positive().optional(),
    autoRebalance: z.boolean(),
    rebalanceStrategy: z.enum(['SPOT', 'CURVE', 'BIDASK']).optional(),
    stopRebalanceMinPrice: z.number().positive().optional(),
    stopRebalanceMaxPrice: z.number().positive().optional(),
    autoTakeFees: z.boolean(),
    feesInterval: z.number().min(1, 'Minimum interval is 1 minute').optional(),
    feeMode: z.enum(['simple', 'sellIntoSol', 'reinvest']),
    feesReinvestStrategy: z.enum(['SPOT', 'CURVE', 'BIDASK']).optional(),
  });
});

// Handle form submission
function handleSubmit(e: Event) {
  e.preventDefault();
  errors.value = {};

  // Prepare form data
  const formData = {
    strategy: strategy.value || undefined,
    tokenXAmount: tokenXAmount.value, // This is now a computed value
    solAmount: solAmount.value === '' ? undefined : Number(solAmount.value),
    stopLossPrice: stopLossPrice.value === '' ? undefined : Number(stopLossPrice.value),
    takeProfitPrice: takeProfitPrice.value === '' ? undefined : Number(takeProfitPrice.value),
    autoRebalance: autoRebalance.value,
    rebalanceStrategy: rebalanceStrategy.value || undefined,
    stopRebalanceMinPrice: stopRebalanceMinPrice.value === '' ? undefined : Number(stopRebalanceMinPrice.value),
    stopRebalanceMaxPrice: stopRebalanceMaxPrice.value === '' ? undefined : Number(stopRebalanceMaxPrice.value),
    autoTakeFees: autoTakeFees.value,
    feesInterval: feesInterval.value,
    feeMode: feeMode.value,
    feesReinvestStrategy: feesReinvestStrategy.value || undefined,
  };

  // Validate
  const result = formSchema.value.safeParse(formData);

  if (!result.success) {
    // Handle validation errors
    result.error.issues.forEach((error: any) => {
      if (error.path[0]) {
        errors.value[error.path[0] as string] = error.message;
      }
    });
    toast.error('Please fix validation errors');
    return;
  }

  // Format data to match backend structure
  const payload: any = {
    poolId: props.poolId,
    solAmount: result.data.solAmount?.toString() || '0',
    strategyType: mapStrategyToBackend(result.data.strategy),
  };

  // Add take profit/stop loss config if provided
  if (result.data.takeProfitPrice || result.data.stopLossPrice) {
    payload.takeProfitConfig = {
      takeProfitPrice: result.data.takeProfitPrice?.toString(),
      stopLossPrice: result.data.stopLossPrice?.toString(),
    };
  }

  // Add rebalance config if enabled
  if (result.data.autoRebalance && result.data.rebalanceStrategy) {
    payload.rebalanceConfig = {
      strategy: mapStrategyToBackend(result.data.rebalanceStrategy),
      stopRebalanceMinimumPrice: result.data.stopRebalanceMinPrice?.toString(),
      stopRebalanceMaximumPrice: result.data.stopRebalanceMaxPrice?.toString(),
    };
  }

  // Add fees config if enabled
  if (result.data.autoTakeFees && result.data.feesInterval) {
    payload.feesConfig = {
      interval: result.data.feesInterval * 60, // Convert minutes to seconds
      mode: result.data.feeMode,
    };

    // Add reinvest strategy if mode is reinvest
    if (result.data.feeMode === 'reinvest' && result.data.feesReinvestStrategy) {
      payload.feesConfig.reinvestStrategy = mapStrategyToBackend(result.data.feesReinvestStrategy);
    }
  }

  // Emit the payload to parent
  emit('submit', payload);
}

// Expose handleSubmit for parent to call
defineExpose({
  handleSubmit
});
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Basic Position Opening Section -->
    <div class="space-y-4">
      <h3 class="text-base font-semibold text-white">Basic Position Opening</h3>

      <!-- Strategy Select -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Strategy</label>
        <Select v-model="strategy">
          <SelectTrigger>
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="SPOT">SPOT</SelectItem>
              <SelectItem value="CURVE">CURVE</SelectItem>
              <SelectItem value="BIDASK">BIDASK</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p v-if="errors.strategy" class="text-sm text-red-500">{{ errors.strategy }}</p>
      </div>

      <!-- Price Inputs Row -->
      <div class="grid grid-cols-2 gap-4">
        <!-- TokenX Input (readonly, calculated) -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ tokenName }}</label>
          <Input
            :model-value="tokenXAmount.toFixed(6)"
            type="text"
            readonly
            class="bg-muted"
          />
          <p class="text-xs text-muted-foreground">Calculated: {{ tokenXAmount.toLocaleString('en-US', { maximumFractionDigits: 2 }) }}</p>
        </div>

        <!-- SOL Input -->
        <div class="space-y-2">
          <label class="text-sm font-medium">SOL</label>
          <Input
            v-model="solAmount"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
          <p class="text-xs text-muted-foreground">
            Max: {{ (maxAmount ?? 100).toFixed(3) }} SOL
          </p>
          <p v-if="errors.solAmount" class="text-sm text-red-500">{{ errors.solAmount }}</p>
        </div>
      </div>
    </div>

    <Separator />

    <!-- Position Config Section -->
    <div class="space-y-4">
      <h3 class="text-base font-semibold text-white">Position Settings</h3>

      <!-- Stop Loss & Take Profit Prices -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Stop Loss Price</label>
          <Input
            v-model="stopLossPrice"
            type="number"
            step="0.01"
            placeholder="0"
          />
          <p v-if="errors.stopLossPrice" class="text-sm text-red-500">{{ errors.stopLossPrice }}</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Take Profit Price</label>
          <Input
            v-model="takeProfitPrice"
            type="number"
            step="0.01"
            placeholder="0"
          />
          <p v-if="errors.takeProfitPrice" class="text-sm text-red-500">{{ errors.takeProfitPrice }}</p>
        </div>
      </div>

      <!-- Rebalance Settings -->
      <div class="space-y-4">
        <div class="flex flex-row items-start space-x-3 space-y-0">
          <Checkbox
            id="autoRebalance"
            v-model="autoRebalance"
          />
          <Label for="autoRebalance" class="cursor-pointer">
            Auto Rebalance when exiting liquidity range
          </Label>
        </div>

        <!-- Rebalance Config Fields (shown when autoRebalance is true) -->
        <div v-if="autoRebalance" class="ml-6 space-y-4 border-l-2 border-zinc-700 pl-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Rebalance Strategy</label>
            <Select v-model="rebalanceStrategy">
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="SPOT">SPOT</SelectItem>
                  <SelectItem value="CURVE">CURVE</SelectItem>
                  <SelectItem value="BIDASK">BIDASK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="errors.rebalanceStrategy" class="text-sm text-red-500">{{ errors.rebalanceStrategy }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Stop Loss Rebalance Price</label>
              <Input
                v-model="stopRebalanceMinPrice"
                type="number"
                step="0.01"
                placeholder="0"
              />
              <p v-if="errors.stopRebalanceMinPrice" class="text-sm text-red-500">{{ errors.stopRebalanceMinPrice }}</p>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Take Profit Rebalance Price</label>
              <Input
                v-model="stopRebalanceMaxPrice"
                type="number"
                step="0.01"
                placeholder="0"
              />
              <p v-if="errors.stopRebalanceMaxPrice" class="text-sm text-red-500">{{ errors.stopRebalanceMaxPrice }}</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Fees Settings -->
      <div class="space-y-4">
        <div class="flex flex-row items-start space-x-3 space-y-0">
          <Checkbox
            id="autoTakeFees"
            v-model="autoTakeFees"
          />
          <Label for="autoTakeFees" class="cursor-pointer">
            Auto take fees
          </Label>
        </div>

        <!-- Fees Config Fields (shown when autoTakeFees is true) -->
        <div v-if="autoTakeFees" class="ml-6 space-y-4 border-l-2 border-zinc-700 pl-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Fees taking interval in minutes</label>
            <Input
              v-model="feesInterval"
              type="number"
              min="1"
              placeholder="1"
            />
            <p v-if="errors.feesInterval" class="text-sm text-red-500">{{ errors.feesInterval }}</p>
          </div>

          <!-- Fee Mode Select -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Fee Collection Mode</label>
            <Select v-model="feeMode">
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
            <p v-if="errors.feeMode" class="text-sm text-red-500">{{ errors.feeMode }}</p>
          </div>

          <!-- Fees Reinvest Strategy (shown when feeMode is reinvest) -->
          <div v-if="feeMode === 'reinvest'" class="space-y-2">
            <label class="text-sm font-medium">Fees Reinvesting Strategy</label>
            <Select v-model="feesReinvestStrategy">
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="SPOT">SPOT</SelectItem>
                  <SelectItem value="CURVE">CURVE</SelectItem>
                  <SelectItem value="BIDASK">BIDASK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="errors.feesReinvestStrategy" class="text-sm text-red-500">{{ errors.feesReinvestStrategy }}</p>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
