import { useCallback, useState } from 'react';
import { useConfirm } from './useConfirm.ts';

interface Identifiable {
  id: number;
}

export interface EditableList<T> {
  /** The record currently being edited, or `null` when adding. */
  editing: T | null;
  /** Begin editing a record (or pass `null` to return to add mode). */
  setEditing: (record: T | null) => void;
  /** Leave edit mode without saving. */
  stopEditing: () => void;
  /** Prompt for confirmation, clear edit mode if needed, then delete. */
  confirmDelete: (id: number) => Promise<void>;
}

/**
 * Manages the shared "edit one row at a time + delete with confirmation"
 * interaction used by the ledger and category lists.
 *
 * Tracks which record is currently being edited and exposes a `confirmDelete`
 * that prompts the user, clears the editing state when the edited record is the
 * one being removed, then delegates to `remove`.
 *
 * @typeParam T - A record with a numeric `id`.
 * @param remove - Persists deletion of the record with the given id.
 * @param confirmMessage - Prompt shown before deleting.
 */
export function useEditableList<T extends Identifiable>(
  remove: (id: number) => Promise<void>,
  confirmMessage: string,
): EditableList<T> {
  const [editing, setEditing] = useState<T | null>(null);
  const confirm = useConfirm();

  const stopEditing = useCallback(() => setEditing(null), []);

  const confirmDelete = useCallback(
    async (id: number) => {
      if (!confirm(confirmMessage)) {
        return;
      }
      setEditing((current) => (current?.id === id ? null : current));
      await remove(id);
    },
    [confirm, confirmMessage, remove],
  );

  return { editing, setEditing, stopEditing, confirmDelete };
}
