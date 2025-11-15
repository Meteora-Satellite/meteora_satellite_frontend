<script setup lang="ts">
import type { PositionDTO } from '@/api';
import { computed, ref } from 'vue';
import Card from '../ui/card/Card.vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot, TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui';
import Separator from '../ui/separator/Separator.vue';
import { Copy } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

enum CurrencyEnum {
  tokenX = 'USD',
  tokenY = 'SOL'
};

const props = defineProps<{position: PositionDTO}>();

const currency = ref<CurrencyEnum>(CurrencyEnum.tokenY);

const getCurrenycNumber = computed(() => (number:number) : string => {
  if (currency.value === CurrencyEnum.tokenX) {
    return `$${number.toFixed(2)}`;
  } else if (currency.value === CurrencyEnum.tokenY) {
    return `${number} SOL`;
  }
  return `${number}`;
})

const changeCurrency = () => {
  if (currency.value === CurrencyEnum.tokenX) {
    currency.value = CurrencyEnum.tokenY
  } else {
    currency.value = CurrencyEnum.tokenX
  }
}

const copyToClipboard = async (val: string) => {
  try {
    await navigator.clipboard.writeText(val)
    toast.success('Copied to clipboard')
  } catch (err) {
    toast.error('Failed to copy.')
  }
}

const currentPriceIn = ref<'SOL' | 'MET'>('MET');

const {position} = props;
</script>

<template>
  <div>
    <!-- Liquidity Tokens START -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-white">Liquidity Tokens</h3>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="flex items-center justify-between py-2">
        <div class="flex items-center space-x-3">
          <img :src="position.tokenX.icon" :alt="position.tokenX.symbol" class="w-6 h-6 rounded-full" />
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-medium block text-white">{{ position.tokenX.symbol }}</span>
              <span
                v-if="position.tokenX.mint"
                class="cursor-pointer text-xs bg-muted text-white-400 px-[7px] py-[4px] rounded-md"
                @click="copyToClipboard(position.tokenX.mint)"
              >
                {{ position.tokenX.mint }} <Copy :size="16" class="text-gray inline" />
              </span>
            </div>
            <span
              class="text-sm"
              :class="{
                'text-green-400': position.tokenX.organicScore > 90,
                'text-orange-400': position.tokenX.organicScore < 90 && position.tokenX.organicScore >= 50,
                'text-red-400': position.tokenX.organicScore < 50,
              }"
            >Score: {{ position.tokenX.organicScore }}</span>
          </div>
        </div>
        <!-- <span class="text-lg font-semibold text-gray-200">22,462.12</span> -->
      </div>
      <div class="flex items-center justify-between py-2">
        <div class="flex items-center space-x-3">
          <img :src="position.tokenY.icon" :alt="position.tokenY.symbol" class="w-6 h-6 rounded-full" />
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-medium block text-white">{{ position.tokenY.symbol }}</span>
              <span
                v-if="position.tokenY.mint"
                class="cursor-pointer text-xs bg-muted text-white-400 px-[7px] py-[4px] rounded-md"
                @click="copyToClipboard(position.tokenY.mint)"
              >
                {{ position.tokenY.mint }} <Copy :size="14" class="text-gray inline" />
              </span>
            </div>
            <span
              class="text-sm"
              :class="{
                'text-green-400': position.tokenY.organicScore > 90,
                'text-orange-400': position.tokenY.organicScore < 90 && position.tokenY.organicScore >= 50,
                'text-red-400': position.tokenY.organicScore < 50,
              }"
            >Score: {{ position.tokenY.organicScore }}</span>
          </div>
        </div>
        <!-- <span class="text-lg font-semibold text-gray-200">22,462.12</span> -->
      </div>
    </div>
    <!-- Liquidity Tokens END -->
    <Separator class="mb-4 mt-4" />
    <!-- Your Liquidity START -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-white">Your Liquidity</h3>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger>
            <Card
              class="p-6 gap-2 text-left cursor-pointer"
              @click="changeCurrency()"
            >
              <p class="text-sm text-muted-foreground">
                Total Liquidity
              </p>
              <code class="text-xs bg-muted px-2 py-1 rounded">
                {{ currency === CurrencyEnum.tokenY ? getCurrenycNumber(parseFloat(position.onchainData.tokenY.total.inSol) + parseFloat(position.onchainData.tokenX.total.inSol)) : getCurrenycNumber(parseFloat(position.onchainData.tokenX.total.inUsd) + parseFloat(position.onchainData.tokenY.total.inUsd)) }}
              </code>
            </Card>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=bottom]:animate-slideUpAndFade select-none text-sm rounded py-[10px] leading-none shadow-sm bg-card border will-change-[transform,opacity] p-2"
            >
              Switch to {{ currency === CurrencyEnum.tokenX ? 'SOL' : '$' }}
              <TooltipArrow
                class="bg-card stroke-border"
                :width="12"
                :height="6"
              />
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </TooltipProvider>
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger>
            <Card
              class="p-6 gap-2 text-left cursor-pointer"
              @click="changeCurrency()"
            >
              <p class="text-sm text-muted-foreground">
                Fees earned (claimed)
              </p>
              <code class="text-xs bg-muted px-2 py-1 rounded">
                {{ currency === CurrencyEnum.tokenY ? getCurrenycNumber(parseFloat(position.onchainData.tokenY.claimedFee.inSol) + parseFloat(position.onchainData.tokenX.claimedFee.inSol)) : getCurrenycNumber(parseFloat(position.onchainData.tokenX.claimedFee.inUsd) + parseFloat(position.onchainData.tokenY.claimedFee.inUsd)) }}
              </code>
            </Card>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=bottom]:animate-slideUpAndFade select-none text-sm rounded py-[10px] leading-none shadow-sm bg-card border will-change-[transform,opacity] p-2"
            >
              Switch to {{ currency === CurrencyEnum.tokenX ? 'SOL' : '$' }}
              <TooltipArrow
                class="bg-card stroke-border"
                :width="12"
                :height="6"
              />
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </TooltipProvider>
    </div>
    <!-- Your Liquidity END -->
    <Separator class="mb-4 mt-4" />
    <!-- Current Balance + Uncliamed swap fee START  -->
    <div class="grid grid-cols-2 gap-4">
      <div class="p-0">
        <h3 class="text-lg font-semibold text-gray mb-4">
          Current Balance
        </h3>
        <div class="flex items-center space-x-3 mb-2">
          <img :src="position.tokenX.icon" :alt="position.tokenX.symbol" class="w-6 h-6 rounded-full" />
          <h3 class="text-lg font-semibold text-white">
            {{ position.onchainData.tokenX.total.inToken }}
            {{ position.tokenX.symbol }}
            <TooltipProvider>
              <TooltipRoot>
                <TooltipTrigger>
                  <span
                    class="text-muted-foreground cursor-pointer"
                    @click="changeCurrency()"
                  >
                    ({{ getCurrenycNumber(parseFloat(position.onchainData.tokenX.total.inUsd)) }})
                  </span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=bottom]:animate-slideUpAndFade select-none text-sm rounded py-[10px] leading-none shadow-sm bg-card border will-change-[transform,opacity] p-2 z-99"
                  >
                    Switch to {{ currency === CurrencyEnum.tokenX ? 'SOL' : '$' }}
                    <TooltipArrow
                      class="bg-card stroke-border"
                      :width="12"
                      :height="6"
                    />
                  </TooltipContent>
                </TooltipPortal>
              </TooltipRoot>
            </TooltipProvider>
          </h3>
        </div>
        <div class="flex items-center space-x-3">
          <img :src="position.tokenY.icon" :alt="position.tokenY.symbol" class="w-6 h-6 rounded-full" />
          <h3 class="text-lg font-semibold text-white">
            {{ position.onchainData.tokenY.total.inToken }}
            {{ position.tokenY.symbol }}
            <span class="text-muted-foreground">
              (${{ position.onchainData.tokenY.total.inUsd }})
            </span>
          </h3>
        </div>
      </div>
      <div class="p-0">
        <h3 class="text-lg font-semibold text-gray mb-4">
          Your Unclaimed Swap Fee
        </h3>
        <div class="flex items-center space-x-3 mb-2">
          <img :src="position.tokenX.icon" :alt="position.tokenX.symbol" class="w-6 h-6 rounded-full" />
          <h3 class="text-lg font-semibold text-white">
            {{ position.onchainData.tokenX.fee.inToken }}
            {{ position.tokenX.symbol }}
            <TooltipProvider>
              <TooltipRoot>
                <TooltipTrigger>
                  <span
                    class="text-muted-foreground cursor-pointer"
                    @click="changeCurrency()"
                  >
                    ({{ getCurrenycNumber(parseFloat(position.onchainData.tokenX.fee.inUsd)) }})
                  </span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=bottom]:animate-slideUpAndFade select-none text-sm rounded py-[10px] leading-none shadow-sm bg-card border will-change-[transform,opacity] p-2 z-99"
                  >
                    Switch to {{ currency === CurrencyEnum.tokenX ? 'SOL' : '$' }}
                    <TooltipArrow
                      class="bg-card stroke-border"
                      :width="12"
                      :height="6"
                    />
                  </TooltipContent>
                </TooltipPortal>
              </TooltipRoot>
            </TooltipProvider>
          </h3>
        </div>
        <div class="flex items-center space-x-3">
          <img :src="position.tokenY.icon" :alt="position.tokenY.symbol" class="w-6 h-6 rounded-full" />
          <h3 class="text-lg font-semibold text-white">
            {{ position.onchainData.tokenY.fee.inToken }}
            {{ position.tokenY.symbol }}
            <span class="text-muted-foreground">
              (${{ position.onchainData.tokenY.fee.inUsd }})
            </span>
          </h3>
        </div>
      </div>
    </div>
    <!-- Current Balance + Uncliamed swap fee END  -->
    <Separator class="mb-4 mt-4" />
    <!-- Current Price START -->
    <div class="block items-center justify-between">
      <h3 class="text-lg font-semibold text-white mb-2">
        Current Price - {{ currentPriceIn === 'SOL' ? position.onchainData.prices.xPerY : position.onchainData.prices.yPerX  }}
      </h3>
      <RadioGroupRoot
        v-model="currentPriceIn"
        class="flex mt-2 gap-4.5"
        default-value="default"
        aria-label="View density"
      >
        <div class="flex items-center">
          <RadioGroupItem
            id="r1"
            class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
            :value="position.tokenX.symbol"
          >
            <RadioGroupIndicator
              class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
            />
          </RadioGroupItem>
          <label
            class="text-stone-700 dark:text-white text-sm leading-none pl-[5px] flex items-center"
            for="r1"
          >
            <img :src="position.tokenX.icon" :alt="position.tokenX.symbol" class="w-6 h-6 rounded-full mr-2" />
            {{ position.tokenX.symbol }}
          </label>
        </div>
        <div class="flex items-center">
          <RadioGroupItem
            id="r2"
            class="bg-white w-[1.125rem] h-[1.125rem] rounded-full border data-[active=true]:border-stone-700 data-[active=true]:bg-stone-700 dark:data-[active=true]:bg-white shadow-sm focus:shadow-[0_0_0_2px] focus:shadow-stone-700 outline-none cursor-default"
            :value="position.tokenY.symbol"
          >
            <RadioGroupIndicator
              class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-[50%] after:bg-white dark:after:bg-stone-700"
            />
          </RadioGroupItem>
          <label
            class="text-stone-700 dark:text-white text-sm leading-none pl-[5px] flex items-center"
            for="r2"
          >
            <img :src="position.tokenY.icon" :alt="position.tokenY.symbol" class="w-6 h-6 rounded-full mr-2" />
            {{ position.tokenY.symbol }}
          </label>
        </div>
      </RadioGroupRoot>
    </div>
    <!-- Current Price END -->
    <Separator class="mb-4 mt-4" />
    <!-- BinRange Start -->
    <div class="block items-center justify-between">
      <h3 class="text-lg font-semibold text-white mb-2">
        Bin Range
      </h3>
      <span class="text-white block">
        {{ position.onchainData.lowerBinId }} - {{ position.onchainData.upperBinId }}
        <span class="text-muted-foreground">
          (Active Bin - {{ position.onchainData.activeBinId }})
        </span>
      </span>
      <!-- <div class="grid grid-cols-2 gap-4">
        <div class="">
          <p class="text-sm text-muted-foreground">
            Lower Bin ID - 
          </p>
        </div>
        <div class="">
          <p class="text-sm text-muted-foreground">
            Upper Bin ID - 
          </p>
        </div> -->
      <!-- </div> -->
    </div>
    <!-- BinRange END -->
  </div>
</template>