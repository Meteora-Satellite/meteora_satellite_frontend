import { defineStore } from 'pinia';
import { ref } from 'vue';
import { toast } from 'vue-sonner';

import { getPoolInformation } from '@/services/meteora';
import type { PositionDTO } from '@/api';

export const usePoolsStore = defineStore('pools', () => {
  const selectedPoolInfo = ref<any>();
  const selectedPoolId = ref<string | null>(null)

  const urlInput = ref<string | null>(null)

  const selectedPoolPositionId = ref<PositionDTO['id'] | null>(null)

  const selPoolId = (val: string | null) => {
    selectedPoolId.value = val
  }
  const setUrlInput = (val: string | null) => {
    urlInput.value = val
  }

  const setSelectedPoolPositionId = (val: PositionDTO['id']) => {
    selectedPoolPositionId.value = val
  }
  // const selectedPoolInfo = ref<any>({
  //   address: "8ztFxjFPfVUtEf4SLSapcFj8GW2dxyUA9no2bLPq7H7V",
  //   name: "USELESS-SOL",
  //   mint_x: "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk",
  //   mint_y: "So11111111111111111111111111111111111111112",
  //   reserve_x: "64GTWbkiCgZt62EMccjFHRoT1MQAQviDioa63NCj37w8",
  //   reserve_y: "HJfR4mh9Yctrrh8pQQsrGsNdqV7KfpaaXGSdxGTwoeBK",
  //   reserve_x_amount: 5134460159131,
  //   reserve_y_amount: 8715059265985,
  //   bin_step: 20,
  //   base_fee_percentage: "0.2",
  //   max_fee_percentage: "1.1800001",
  //   protocol_fee_percentage: "5",
  //   liquidity: "3316211.3307147906",
  //   reward_mint_x: "11111111111111111111111111111111",
  //   reward_mint_y: "11111111111111111111111111111111",
  //   fees_24h: 30000.002133763355,
  //   today_fees: 25775.187472716905,
  //   trade_volume_24h: 15074806.817815263,
  //   cumulative_trade_volume: "1383159460.0800",
  //   cumulative_fee_volume: "3144347.4400",
  //   current_price: 0.0017392373935074255,
  //   apr: 0.9046468738558053,
  //   apy: 2576.5533994747143,
  //   farm_apr: 0.0,
  //   farm_apy: 0.0,
  //   hide: false,
  //   is_blacklisted: false,
  //   fees: {
  //     min_30: 433.1197290818621,
  //     hour_1: 1160.2524496159576,
  //     hour_2: 2312.483460490718,
  //     hour_4: 4383.731484116982,
  //     hour_12: 11607.326728089458,
  //     hour_24: 30000.002133763355,
  //   },
  //   fee_tvl_ratio: {
  //     min_30: 0.01306067936835936,
  //     hour_1: 0.03498728922580069,
  //     hour_2: 0.06973269281943727,
  //     hour_4: 0.13219095669551595,
  //     hour_12: 0.3500177030511371,
  //     hour_24: 0.9046468738558053,
  //   },
  //   volume: {
  //     min_30: 225368.2934627849,
  //     hour_1: 594470.2717566806,
  //     hour_2: 1188108.728950301,
  //     hour_4: 2257359.8775129034,
  //     hour_12: 5921250.645039503,
  //     hour_24: 15074806.817815263,
  //   },
  //   tags: [],
  //   launchpad: null,
  //   is_verified: true,
  // });

  const getSelectedPoolInfo = async (poolId: string) => {
    try {
      selectedPoolInfo.value = await getPoolInformation(poolId);
    } catch (error: any) {
      toast.error('Failed to fetch pool information', {
        description: error.message || 'Unknown error',
      });
      throw error;
    }
  };

  return {
    selectedPoolInfo,
    getSelectedPoolInfo,
    selectedPoolPositionId,
    selectedPoolId,
    selPoolId,
    urlInput,
    setUrlInput,
    setSelectedPoolPositionId
  };
});
