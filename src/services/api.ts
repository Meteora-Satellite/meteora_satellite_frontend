const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mtsat.xyz';

// Auth Types
export interface NonceRequest {
  address: string
}

export interface NonceResponse {
  ok: boolean
  data: {
    message: string
  }
}

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
  mode: 'simple' | 'sellIntoSol' | 'reinvest'
}

export interface CreatePositionRequest {
  poolId: string
  solAmount: string
  strategyType: 'spot' | 'curve' | 'bidAsk'
  takeProfitConfig?: TakeProfitConfig
  rebalanceConfig?: RebalanceConfig
  feesConfig?: FeesConfig
}

export interface Position {
  id: string
  poolId: string
  solAmount: string
  strategyType: 'spot' | 'curve' | 'bidAsk'
  takeProfitConfig?: TakeProfitConfig | null
  rebalanceConfig?: RebalanceConfig | null
  feesConfig?: FeesConfig | null
  createdAt: string
  updatedAt: string
}

export interface CreatePositionResponse {
  ok: boolean
  data: Position
}

export interface GetPositionsResponse {
  ok: boolean
  data: {
    items: Position[]
    page: number
    limit: number
    total: number
  }
}

// Update Position Types
export interface UpdatePositionRequest {
  takeProfitConfig?: TakeProfitConfig | null
  rebalanceConfig?: RebalanceConfig | null
  feesConfig?: FeesConfig | null
}

export interface UpdatePositionResponse {
  ok: boolean
  data: Position
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
  data: Position
}

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshInProgress = false;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Загружаем токены из localStorage при инициализации
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
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
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // отправит HttpOnly куку с refresh токеном
        });

        if (!response.ok) throw new Error('Refresh failed');
        const data = await response.json();

        if (!data?.accessToken) throw new Error('No new access token');
        this.setTokens(data.accessToken);
      } catch (err) {
        this.clearTokens();
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
      credentials: 'include',
    });

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
  async getNonce(address: string): Promise<NonceResponse> {
    return this.request<NonceResponse>('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address } as NonceRequest),
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
  async getWallet(): Promise<WalletResponse> {
    return this.request<WalletResponse>('/users/wallet');
  }

  async getWalletBalances(): Promise<WalletBalancesResponse> {
    return this.request<WalletBalancesResponse>('/wallets/balances');
  }

  // Position endpoints
  async createPosition(data: CreatePositionRequest): Promise<CreatePositionResponse> {
    return this.request<CreatePositionResponse>('/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPositions(poolId?: string): Promise<GetPositionsResponse> {
    const url = poolId ? `/positions?poolId=${poolId}` : '/positions';
    return this.request<GetPositionsResponse>(url, {
      method: 'GET',
    });
  }

  async closePosition(positionId: string): Promise<ClosePositionResponse> {
    return this.request<ClosePositionResponse>(`/positions/${positionId}`, {
      method: 'DELETE',
    });
  }

  async updatePosition(positionId: string, data: UpdatePositionRequest): Promise<UpdatePositionResponse> {
    return this.request<UpdatePositionResponse>(`/positions/${positionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

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
}

export const apiClient = new APIClient(API_BASE_URL);
