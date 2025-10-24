import axios from 'axios';

export async function getPoolInformation(poolId: string) {
  const poolInfo = await axios.get(`https://dlmm-api.meteora.ag/pair/${poolId}`);
  return poolInfo.data;
}
