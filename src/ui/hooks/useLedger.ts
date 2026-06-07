import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, createLedger, deleteLedger, listLedger, updateLedger } from '../lib/client.ts';
import type { CreateLedgerEntryDto, LedgerEntry, UpdateLedgerEntryDto } from '../types.ts';

export interface UseLedgerResult {
  records: LedgerEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (dto: CreateLedgerEntryDto) => Promise<void>;
  update: (id: number, dto: UpdateLedgerEntryDto) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Apply a partial update to a record for an optimistic preview (category is
 * left to the server response since the hook has no category catalog). */
function applyPatch(record: LedgerEntry, dto: UpdateLedgerEntryDto): LedgerEntry {
  return {
    ...record,
    ...(dto.type !== undefined ? { type: dto.type } : {}),
    ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
    ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
    ...(dto.description !== undefined ? { description: dto.description } : {}),
    ...(dto.date !== undefined ? { date: dto.date } : {}),
  };
}

/**
 * Loads a full calendar year of ledger entries in a single request and exposes
 * CRUD wrappers. Pages filter the returned records client-side by the selected
 * period (week/month), category and type — the API only accepts a period+anchor
 * range, so fetching the year is what makes arbitrary Monday-week navigation
 * (incl. weeks that straddle a month) correct without new endpoints.
 *
 * Edits and deletes apply optimistically and roll back to the prior snapshot if
 * the request fails. Creates round-trip first (no client-side id to assign).
 */
export function useLedger(year: number): UseLedgerResult {
  const [records, setRecords] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      setLoading(true);
      return listLedger('year', { year, month: 1 })
        .then((data) => {
          if (isActive()) {
            setRecords(data.records);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (isActive()) setError(toMessage(err, 'Failed to load entries'));
        })
        .finally(() => {
          if (isActive()) setLoading(false);
        });
    },
    [year],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const create = useCallback(
    async (dto: CreateLedgerEntryDto) => {
      const created = await createLedger(dto);
      // Only merge into local state if it belongs to the loaded year.
      if (created.date.startsWith(String(year))) {
        setRecords((prev) => [created, ...prev]);
      }
    },
    [year],
  );

  const update = useCallback(async (id: number, dto: UpdateLedgerEntryDto) => {
    let snapshot: LedgerEntry[] = [];
    setRecords((prev) => {
      snapshot = prev;
      return prev.map((r) => (r.id === id ? applyPatch(r, dto) : r));
    });
    try {
      const saved = await updateLedger(id, dto);
      setRecords((prev) => prev.map((r) => (r.id === id ? saved : r)));
    } catch (err) {
      setRecords(snapshot); // rollback
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    let snapshot: LedgerEntry[] = [];
    setRecords((prev) => {
      snapshot = prev;
      return prev.filter((r) => r.id !== id);
    });
    try {
      await deleteLedger(id);
    } catch (err) {
      setRecords(snapshot); // rollback
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { records, loading, error, refresh, create, update, remove };
}

/**
 * Resolves a single record from already-loaded list data — there is no
 * GET /api/ledger/:id endpoint, so this reads the cache rather than fetching.
 */
export function useLedgerRecord(records: LedgerEntry[], id: number | null): LedgerEntry | null {
  return useMemo(
    () => (id == null ? null : (records.find((r) => r.id === id) ?? null)),
    [records, id],
  );
}
