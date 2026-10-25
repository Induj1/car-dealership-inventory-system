import type {
  Purchase,
  SearchMeta,
  User,
  Vehicle,
  VehicleFilters,
  VehicleInput,
} from '../types/index.js';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

/** An error carrying the status and machine-readable code the API returned. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the server rejected our credentials, so the UI should sign out. */
  get isAuthFailure(): boolean {
    return this.status === 401;
  }
}

type TokenReader = () => string | null;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * The single place the frontend talks to the network.
 *
 * Every component goes through these methods, so the auth header, the
 * response envelope and error translation are each written exactly once. The
 * token is read through a callback rather than captured, so the client picks
 * up a fresh login without being rebuilt.
 */
export class ApiClient {
  constructor(
    private readonly getToken: TokenReader,
    private readonly baseUrl: string = API_URL,
  ) {}

  // Auth ---------------------------------------------------------------

  register(input: { name: string; email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: input,
    });
  }

  login(input: { email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: input,
    });
  }

  me() {
    return this.request<{ user: User }>('/auth/me');
  }

  // Vehicles -----------------------------------------------------------

  async searchVehicles(
    filters: VehicleFilters = {},
    signal?: AbortSignal,
  ): Promise<{ vehicles: Vehicle[]; meta: SearchMeta }> {
    const { data, meta } = await this.requestWithMeta<{ vehicles: Vehicle[] }, SearchMeta>(
      '/vehicles/search',
      { query: filters as Record<string, unknown>, signal },
    );

    return { vehicles: data.vehicles, meta };
  }

  getVehicle(id: string) {
    return this.request<{ vehicle: Vehicle }>(`/vehicles/${id}`);
  }

  filterOptions() {
    return this.request<{ makes: string[]; categories: string[] }>('/vehicles/filters');
  }

  createVehicle(input: VehicleInput) {
    return this.request<{ vehicle: Vehicle }>('/vehicles', { method: 'POST', body: input });
  }

  updateVehicle(id: string, patch: Partial<VehicleInput>) {
    return this.request<{ vehicle: Vehicle }>(`/vehicles/${id}`, { method: 'PUT', body: patch });
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.request<null>(`/vehicles/${id}`, { method: 'DELETE' });
  }

  // Inventory ----------------------------------------------------------

  purchaseVehicle(id: string, quantity = 1) {
    return this.request<{ vehicle: Vehicle; purchase: Purchase }>(`/vehicles/${id}/purchase`, {
      method: 'POST',
      body: { quantity },
    });
  }

  restockVehicle(id: string, quantity: number) {
    return this.request<{ vehicle: Vehicle }>(`/vehicles/${id}/restock`, {
      method: 'POST',
      body: { quantity },
    });
  }

  myPurchases() {
    return this.request<{ purchases: Purchase[] }>('/purchases/me');
  }

  // Transport ----------------------------------------------------------

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { data } = await this.requestWithMeta<T, unknown>(path, options);
    return data;
  }

  private async requestWithMeta<T, M>(
    path: string,
    { method = 'GET', body, query, signal }: RequestOptions = {},
  ): Promise<{ data: T; meta: M }> {
    const token = this.getToken();

    const response = await fetch(`${this.baseUrl}${path}${buildQueryString(query)}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    // 204 No Content: nothing to parse.
    if (response.status === 204) {
      return { data: null as T, meta: undefined as M };
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      const error = payload?.error;
      throw new ApiError(
        error?.message ?? `Request failed with status ${response.status}`,
        response.status,
        error?.code ?? 'NETWORK_ERROR',
        error?.details,
      );
    }

    return { data: payload.data as T, meta: payload.meta as M };
  }
}

/**
 * Serialises a filter object into a query string, dropping empty values so
 * that cleared filters disappear from the URL instead of sending "".
 */
export function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return '';

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, String(value));
  }

  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}
