import { defineStore } from "pinia";
import { onMounted, ref, watch } from "vue";
import { useAuthStore } from "./auth";
import WSClient from "@/services/ws";


export const useWSClientStore = defineStore('wsClient', () => {
    const wsClient = ref();

    const setWSClient = (val:any) => {
        wsClient.value = val
    }
    const auth = useAuthStore()

    const initWSClient = () => {
        if (!auth.isAuthenticated || wsClient.value) return;
        wsClient.value = new WSClient();
        wsClient.value.connect()
    }
    watch(
        () => auth.isAuthenticated,
        (isAuth, oldAuth) => {
            if (isAuth && !oldAuth && !wsClient.value) {
                initWSClient()
            }
        },
        { immediate: true }
    )

    return {wsClient, setWSClient, initWSClient}
})