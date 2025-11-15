import { toast } from 'vue-sonner';

import { useAuthStore } from '@/stores/auth';

import { Configuration } from '@/api/runtime'
import { AuthApi } from '@/api/apis/AuthApi'
import { UsersApi } from '@/api/apis/UsersApi'
import { PositionsApi } from '@/api/apis/PositionsApi'
import { WalletsApi } from '@/api/apis/WalletsApi'
import { NotificationsApi } from '@/api/apis/NotificationsApi'
import { PushApi, type PositionDTO } from '@/api';

export const API_BASE_URL = import.meta.env.DEV ? import.meta.env.VITE_DEV_API_URL : import.meta.env.VITE_API_URL || 'https://mtsat.xyz';

// Auth Types
// export interface NonceRequest {
//   address: string
// }

// export interface NonceResponse {
//   ok: boolean
//   data: {
//     message: string
//   }
// }

export interface VerifyRequest {
  address: string
  signature: string
}

export interface VerifyResponse {
  ok: boolean
  data: {
    access: string
    refresh: string
  }
}

// Wallet Types
export interface WalletResponse {
  ok: boolean
  data: {
    address: string
  }
}

export interface WalletBalancesResponse {
  ok: boolean
  data: {
    solana: string
    tokens: Record<string, string>
  }
}

// Position Types
export interface TakeProfitConfig {
  takeProfitPrice: string
  stopLossPrice: string
}

export interface RebalanceConfig {
  strategy: 'spot' | 'curve' | 'bidAsk'
  stopRebalanceMinimumPrice?: string
  stopRebalanceMaximumPrice?: string
}

export interface FeesConfig {
  interval: number
  mode: 'simple' | 'sellIntoSol' | 'reinvest',
  reinvestStrategy: 'spot' | 'curve' | 'bidAsk'
}

// export interface CreatePositionRequest {
//   poolId: string
//   solAmount: string
//   strategyType: 'spot' | 'curve' | 'bidAsk'
//   takeProfitConfig?: TakeProfitConfig
//   rebalanceConfig?: RebalanceConfig
//   feesConfig?: FeesConfig
// }

// export interface Position {
//   id: string
//   poolId: string
//   solAmount: string
//   strategyType: 'spot' | 'curve' | 'bidAsk'
//   takeProfitConfig?: TakeProfitConfig | null
//   rebalanceConfig?: RebalanceConfig | null
//   feesConfig?: FeesConfig | null
//   createdAt: string
//   updatedAt: string
// }

// export interface CreatePositionResponse {
//   ok: boolean
//   data: PositionDTO
// }

// export interface GetPositionsResponse {
//   ok: boolean
//   data: {
//     items: PositionDTO[]
//     page: number
//     limit: number
//     total: number
//   }
// }

// Update Position Types
// export interface UpdatePositionRequest {
//   takeProfitConfig?: TakeProfitConfig | null
//   rebalanceConfig?: RebalanceConfig | null
//   feesConfig?: FeesConfig | null
// }

export interface UpdatePositionResponse {
  ok: boolean
  data: PositionDTO
}

// Claim Fees Types
export interface ClaimFeesRequest {
  addLiquidity?: boolean
  swap?: boolean
  strategyType?: 'spot' | 'curve' | 'bidAsk'
}

export interface ClaimFeesResponse {
  ok: boolean
  data: {
    positionId: string
    poolId: string
    action?: 'addLiquidity' | 'swap'
    strategyType?: 'spot' | 'curve' | 'bidAsk'
  }
}

// Rebalance Types
export interface RebalancePositionRequest {
  strategyType: 'spot' | 'curve' | 'bidAsk'
}

export interface RebalancePositionResponse {
  ok: boolean
  data: {
    positionId: string
    poolId: string
    requestedStrategy: 'spot' | 'curve' | 'bidAsk'
  }
}

// Remove Liquidity Types
export interface RemoveLiquidityResponse {
  ok: boolean
  data: null
}

// Close Position Response
export interface ClosePositionResponse {
  ok: boolean
  data: PositionDTO
}

export interface LogoutResponse {
  ok: boolean
}

// export interface Notification {
//   id: string,
//   type: 'rebalance' | 'feeClaim' | 'closePosition',
//   title: string,
//   body: string,
//   createdAt: string,
//   isRead: boolean
// }

// export interface GetNotificationsResponse {
//   ok: boolean,
//   data: {
//     items: Notification[],
//     total: number
//   }
// }

// export interface ReadNotificationsResponse {
//   ok: boolean
// }

// export interface ReadAllNotificationsResponse {
//   ok: boolean
// }

// export interface GetPrivateKeyResponse {
//   ok: boolean,
//   data: string
// }

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshInProgress = false;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  openApi: {
    auth: AuthApi
    users: UsersApi
    positions: PositionsApi
    wallets: WalletsApi
    notifications: NotificationsApi
    push: PushApi
  }
  

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Загружаем токены из localStorage при инициализации
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');

  const config = new Configuration({
    basePath: baseURL,
    fetchApi: async (url, init) => {
      const fullUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as any).url || '';
      const relativeUrl = fullUrl.replace(this.baseURL, '');

      try {
        const result = await this.request(relativeUrl, init);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        const status = err.status || 500;
        const message = err.message || 'Unknown error';

        return new Response(JSON.stringify({ error: message }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
  });


    this.openApi = {
      auth: new AuthApi(config),
      users: new UsersApi(config),
      positions: new PositionsApi(config),
      wallets: new WalletsApi(config),
      notifications: new NotificationsApi(config),
      push: new PushApi(config)
    };
  }
  async customFetch(url: string, init: RequestInit) {
    // Просто вызываем твой this.request
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }


  setTokens(access: string, refresh?: string) {
    this.accessToken = access;
    localStorage.setItem('access_token', access);
    if (refresh) {
      this.refreshToken = refresh;
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshTokenFn() {
    if (this.refreshInProgress && this.refreshPromise) {
      // Если уже идёт рефреш — ждём его
      await this.refreshPromise;
      return;
    }

    this.refreshInProgress = true;
    this.refreshPromise = (async () => {
      try {
        const response:any = await this.request('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refresh: this.refreshToken }),
        });

        if (!response.ok) throw new Error('Refresh failed');
        const data = response.data;

        if (!data?.access) throw new Error('No new access token');
        this.setTokens(data.access);
      } catch (err) {
        useAuthStore().signOut();
        // this.clearTokens();
        toast.error('Your session is expired');
        throw err;
      } finally {
        this.refreshInProgress = false;
        this.refreshPromise = null;
      }
    })();

    await this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !retried && !endpoint.includes('/auth/refresh')) {
      try {
        await this.refreshTokenFn();
        return this.request<T>(endpoint, options, true);
      } catch {
        this.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ ok: false, error: 'Unknown error' }));

      // Format error message with validation details if available
      let errorMessage = error.error?.message || error.error || error.message || `HTTP ${response.status}`;

      // Add validation details if present
      if (error.error?.details && Array.isArray(error.error.details)) {
        const validationErrors = error.error.details
          .map((detail: any) => {
            const path = detail.path?.join('.') || 'unknown';
            return `${path}: ${detail.message}`;
          })
          .join('; ');
        errorMessage = `${errorMessage} - ${validationErrors}`;
      }

      const err = new Error(errorMessage);
      (err as any).details = error.error?.details;
      throw err;
    }

    return response.json();
  }

  // Auth endpoints
  // async getNonce(address: string): Promise<NonceResponse> {
  //   return this.request<NonceResponse>('/auth/nonce', {
  //     method: 'POST',
  //     body: JSON.stringify({ address } as NonceRequest),
  //   });
  // }

  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh: this.refreshToken }),
    });
  }

  async verifySignature(data: VerifyRequest): Promise<VerifyResponse> {
    const response = await this.request<VerifyResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Автоматически сохраняем токены
    if (response.ok && response.data) {
      this.setTokens(response.data.access, response.data.refresh);
    }

    return response;
  }

  // Wallet endpoints
  // async getWallet(): Promise<WalletResponse> {
  //   return this.request<WalletResponse>('/users/wallet');
  // }

  // async getWalletBalances(): Promise<WalletBalancesResponse> {
  //   return this.request<WalletBalancesResponse>('/wallets/balances');
  // }

  // Position endpoints
  // async createPosition(data: CreatePositionRequest): Promise<CreatePositionResponse> {
  //   return this.request<CreatePositionResponse>('/positions', {
  //     method: 'POST',
  //     body: JSON.stringify(data),
  //   });
  // }

  // async getPositions(poolId?: string): Promise<GetPositionsResponse> {
  //   const url = poolId ? `/positions?poolId=${poolId}` : '/positions';
  //   return this.request<GetPositionsResponse>(url, {
  //     method: 'GET',
  //   });
  // }

  async closePosition(positionId: string): Promise<ClosePositionResponse> {
    return this.request<ClosePositionResponse>(`/positions/${positionId}`, {
      method: 'DELETE',
    });
  }

  // async updatePosition(positionId: string, data: UpdatePositionRequest): Promise<UpdatePositionResponse> {
  //   return this.request<UpdatePositionResponse>(`/positions/${positionId}`, {
  //     method: 'PATCH',
  //     body: JSON.stringify(data),
  //   });
  // }

  async claimFees(positionId: string, data: ClaimFeesRequest): Promise<ClaimFeesResponse> {
    return this.request<ClaimFeesResponse>(`/positions/${positionId}/claim_fees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rebalancePosition(positionId: string, data: RebalancePositionRequest): Promise<RebalancePositionResponse> {
    return this.request<RebalancePositionResponse>(`/positions/${positionId}/rebalance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeLiquidity(positionId: string, percentage: number): Promise<RemoveLiquidityResponse> {
    return this.request<RemoveLiquidityResponse>(`/positions/${positionId}/liquidity?percentage=${percentage}`, {
      method: 'DELETE',
    });
  }

  // async getNotifications(page: number, limit: number) : Promise<GetNotificationsResponse> {
  //   return this.request<GetNotificationsResponse>(`/notifications?page=${page}&limit=${limit}`, {
  //     method: 'GET',
  //   });
  // }

  // async readNotification(id: Notification['id']) : Promise<ReadNotificationsResponse> {
  //   return this.request<ReadAllNotificationsResponse>(`/notifications/${id}/read`, {
  //     method: 'POST',
  //   });
  // }

  // async readAllNotifications() : Promise<ReadAllNotificationsResponse> {
  //   return this.request<ReadAllNotificationsResponse>('/notifications/read-all', {
  //     method: 'POST',
  //   });
  // }

  // async getPrivateKey(): Promise<GetPrivateKeyResponse> {
  //   return this.request<GetPrivateKeyResponse>('/wallets/private-key', {
  //     method: 'GET',
  //   });
  // }
}

export const apiClient = new APIClient(API_BASE_URL);
