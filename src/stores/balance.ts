import { apiClient } from "@/services/api";
import { defineStore } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useAuthStore } from "./auth";


export const useBalanceStore = defineStore('balance', () => {
    const balance = ref<number | null>(null);

    const setBalance = (val: number | null) => {
        balance.value = val
    }

    const getBalance = async () => {
        try {
            const response = await apiClient.openApi.wallets.walletsBalancesGet()
            if (response.ok) {
                balance.value = parseFloat(response.data.solana);
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to fetch balance');
        }
    }
    const auth = useAuthStore()

    // let balanceInterval:any;
    // onMounted(() => {
    //     balanceInterval = setInterval(() => {
    //         getBalance()
    //     }, 10000)
    // })

    // onUnmounted(() => {
        // if (balanceInterval) clearInterval(balanceInterval)
    // })

    watch(
        () => auth.authenticated,
        (isAuth) => {
            if (isAuth) {
                getBalance()
            } else {
                balance.value = null
            }
        },
        { immediate: true }
    )

    return {balance, getBalance, setBalance}
})