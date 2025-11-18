import type { PositionDTO, PositionOnchainDataSchema, WsClientMessage, WsServerEvent } from "@/api";
import { useBalanceStore } from "@/stores/balance";
import { usePoolsStore } from "@/stores/pools";
import { usePositionsStore } from "@/stores/positions";

type EventCallback = (event: WsServerEvent) => void;
const WS_BASE_URL = import.meta.env.DEV ? import.meta.env.VITE_DEV_WS_URL : import.meta.env.VITE_WS_URL || 'https://mtsat.xyz';


export class WSClient {
  private ws: WebSocket | null = null;
  private url: string = WS_BASE_URL;
  private reconnectInterval = 10000;
  private listeners: EventCallback[] = [];
  private positionCallbacks: Record<string, (data: PositionOnchainDataSchema) => void> = {};

  constructor() {
  }

  connect() {
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No token');
    const wsUrl = `${this.url}/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WsServerEvent = JSON.parse(event.data);
        if (data.type === 'WALLET_BALANCE_UPDATED') {
            this.updateBalance(data.payload)
        } else if (data.type === 'POSITION_DATA_UPDATED' || data.type === 'POSITION_REBALANCED') {
          const posId = data.payload.positionId;
          const callback = this.positionCallbacks[posId];
          if (callback) {
            callback(data.payload.onchainData);
          }
        } else if (data.type === 'POSITION_CLOSED') {
            const positionsStore = usePositionsStore()
            positionsStore.removePosition(data.payload.positionId)
            
            const poolsStore = usePoolsStore();
            poolsStore.selPoolId(null); poolsStore.setUrlInput(null);
        }
        this.listeners.forEach((cb) => cb(data));
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (err) => {
      this.ws?.close();
    };
  }

  send(message: WsClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message', message);
    }
  }

  subscribeOnPositionUpdate(pos_id: string, callback: (data: PositionOnchainDataSchema) => void) {
    this.positionCallbacks[pos_id] = callback;
    this.send({op: 'subscribe', positions: [pos_id]})
  }

  unsubscribeFromPositionUpdate(pos_id: string) {
    delete this.positionCallbacks[pos_id];
    this.send({op: 'unsubscribe', positions: [pos_id]})
  }

  onEvent(callback: EventCallback) {
    this.listeners.push(callback);
  }

  close() {
    console.log('WS closed')
    this.ws?.close();
  }

  updateBalance(data:any) {
    useBalanceStore().setBalance(parseFloat(data.solana))
  }
}
export default WSClient