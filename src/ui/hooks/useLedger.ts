import { useCallback, useEffect, useState } from 'react';
import { ApiError, createLedger, deleteLedger, listLedger, updateLedger } from '../lib/client.ts';
import type {
  CreateLedgerEntryDto,
  LedgerListResult,
  Period,
  UpdateLedgerEntryDto,
} from '../types.ts';

interface UseLedgerResult {
  result: LedgerListResult | null;
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

export function useLedger(period: Period): UseLedgerResult {
  const [result, setResult] = useState<LedgerListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listLedger(period)
      .then((data) => {
        setResult(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(toMessage(err, 'Failed to load entries'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [period]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listLedger(period)
      .then((data) => {
        if (active) {
          setResult(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(toMessage(err, 'Failed to load entries'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [period]);

  const create = useCallback(
    async (dto: CreateLedgerEntryDto) => {
      await createLedger(dto);
      await load();
    },
    [load],
  );

  const update = useCallback(
    async (id: number, dto: UpdateLedgerEntryDto) => {
      await updateLedger(id, dto);
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteLedger(id);
      await load();
    },
    [load],
  );

  return { result, loading, error, refresh: load, create, update, remove };
}
