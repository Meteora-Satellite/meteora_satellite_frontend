import { apiClient } from "@/services/api";
import { defineStore } from "pinia";
import { onMounted, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useAuthStore } from "./auth";
import { BaseAPI } from "@/api";


export const useBalanceStore = defineStore('balance', () => {
    const balance = ref<number | null>(null);

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

    return {balance, getBalance}
})