import { useCallback } from 'react';

/**
 * Returns a function that asks the user to confirm a destructive action.
 *
 * Currently backed by the native `window.confirm`. Centralizing it here gives a
 * single seam to later swap in a styled, accessible dialog without touching any
 * call sites.
 *
 * @returns A `confirm(message)` predicate that resolves synchronously to the
 *   user's choice.
 */
export function useConfirm(): (message: string) => boolean {
  return useCallback((message: string) => window.confirm(message), []);
}
