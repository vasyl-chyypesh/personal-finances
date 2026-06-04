import type {
  Category,
  CreateCategoryDto,
  CreateLedgerEntryDto,
  ExchangeRatesResponse,
  LedgerEntry,
  LedgerListResult,
  LocalizedName,
  Period,
  UpdateLedgerEntryDto,
} from '../types.ts';

const BASE = '/api';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('Network error — is the API running?', 'NETWORK_ERROR', 0);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as
    | { code?: string; message?: string }
    | T
    | null;

  if (!res.ok) {
    const err = (body ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      err.message ?? `Request failed (${res.status})`,
      err.code ?? 'UNKNOWN',
      res.status,
    );
  }

  return body as T;
}

export function getCategories(includeDeleted = false): Promise<Category[]> {
  const query = includeDeleted ? '?includeDeleted=true' : '';
  return request<Category[]>(`/categories${query}`);
}

export function createCategory(dto: CreateCategoryDto): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateCategoryNames(id: number, names: LocalizedName): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ names }),
  });
}

export function deleteCategory(id: number): Promise<void> {
  return request<void>(`/categories/${id}`, { method: 'DELETE' });
}

export function restoreCategory(id: number): Promise<Category> {
  return request<Category>(`/categories/${id}/restore`, { method: 'POST' });
}

export function reorderCategories(ids: number[]): Promise<void> {
  return request<void>('/categories/order', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

export function getExchangeRates(): Promise<ExchangeRatesResponse> {
  return request<ExchangeRatesResponse>('/exchange-rates');
}

export function listLedger(
  period: Period,
  opts?: { year?: number; month?: number },
): Promise<LedgerListResult> {
  const params = new URLSearchParams({ period });
  if (opts?.year !== undefined && opts.month !== undefined) {
    params.set('year', String(opts.year));
    params.set('month', String(opts.month));
  }
  return request<LedgerListResult>(`/ledger?${params.toString()}`);
}

export function createLedger(dto: CreateLedgerEntryDto): Promise<LedgerEntry> {
  return request<LedgerEntry>('/ledger', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateLedger(id: number, dto: UpdateLedgerEntryDto): Promise<LedgerEntry> {
  return request<LedgerEntry>(`/ledger/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export function deleteLedger(id: number): Promise<void> {
  return request<void>(`/ledger/${id}`, { method: 'DELETE' });
}
