import type {
  Category,
  CreateLedgerEntryDto,
  LedgerEntry,
  LedgerListResult,
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

export function getCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function listLedger(period: Period): Promise<LedgerListResult> {
  return request<LedgerListResult>(`/ledger?period=${period}`);
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
