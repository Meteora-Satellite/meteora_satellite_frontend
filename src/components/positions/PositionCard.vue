<script setup lang="ts">
import { computed } from 'vue';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Position } from '@/services/api';
import { getColorFromString } from '@/lib/utils';

interface Props {
  position: Position;
  poolName?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [position: Position]
}>();

// Format the position ID for display (shortened)
const shortId = computed(() => {
  return `${props.position.id.slice(0, 8)}...${props.position.id.slice(-8)}`;
});

// Format strategy type for display
const strategyLabel = computed(() => {
  return props.position.strategyType.toUpperCase();
});

// Determine if position has any configs
const hasConfigs = computed(() => {
  return !!(props.position.takeProfitConfig || props.position.rebalanceConfig || props.position.feesConfig);
});

const borderColor = computed(() => {
  return getColorFromString(props.position.poolId);
});

// Handle card click
function handleClick() {
  emit('click', props.position);
}
</script>

<template>
  <Card
    class="cursor-pointer hover:bg-accent/50 transition-colors !p-4 border-l-4"
    :style="{ borderLeftColor: borderColor }"
    @click="handleClick"
  >
    <CardHeader class="!p-0 !pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h4 class="font-semibold text-base">
            {{ poolName || 'Pool' }}
          </h4>
          <span class="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
            Active
          </span>
        </div>
        <span class="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20">
          {{ strategyLabel }}
        </span>
      </div>
    </CardHeader>

    <CardContent class="!p-0 space-y-2">
      <!-- SOL Amount -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">SOL Amount</span>
        <span class="font-medium">{{ position.solAmount }} SOL</span>
      </div>

      <!-- Position ID -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-foreground">Position ID</span>
        <code class="bg-muted px-2 py-0.5 rounded font-mono">{{ shortId }}</code>
      </div>

      <!-- Config indicators -->
      <div v-if="hasConfigs" class="flex gap-1 pt-1">
        <span
          v-if="position.takeProfitConfig"
          class="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20"
        >
          TP/SL
        </span>
        <span
          v-if="position.rebalanceConfig"
          class="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-500 rounded border border-purple-500/20"
        >
          Auto Rebalance
        </span>
        <span
          v-if="position.feesConfig"
          class="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded border border-green-500/20"
        >
          Auto Fees
        </span>
      </div>
    </CardContent>
  </Card>
</template>
