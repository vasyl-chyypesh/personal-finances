import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';

export interface ConfirmTooltipProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Anchor side relative to the trigger. Default 'bottom-right'. */
  placement?: 'bottom-right' | 'bottom-left' | 'top-right';
  /** Auto-dismiss delay in ms. Default 4000. */
  autoCloseMs?: number;
}

const PLACEMENT: Record<NonNullable<ConfirmTooltipProps['placement']>, string> = {
  'bottom-right': 'top-full right-0 mt-1',
  'bottom-left': 'top-full left-0 mt-1',
  'top-right': 'bottom-full right-0 mb-1',
};

/**
 * Inline confirmation popover for destructive actions — never window.confirm().
 * The parent wraps the trigger in a `relative` element and renders this inside.
 * Auto-closes after `autoCloseMs`; Escape cancels; focus moves to Confirm.
 */
export function ConfirmTooltip({
  open,
  onConfirm,
  onCancel,
  message,
  confirmLabel,
  cancelLabel,
  placement = 'bottom-right',
  autoCloseMs = 4000,
}: ConfirmTooltipProps) {
  const { t } = useI18n();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const timer = window.setTimeout(onCancel, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [open, autoCloseMs, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={message ?? t('confirm.message')}
      // eslint-disable-next-line security/detect-object-injection -- key is a literal union
      className={`absolute z-30 w-max min-w-44 rounded-md border-hairline border-line bg-surface p-3 shadow-lg ${PLACEMENT[placement]}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <p className="mb-2 text-xs text-fg">{message ?? t('confirm.message')}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm px-2.5 py-1 text-xs text-fg-muted transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {cancelLabel ?? t('confirm.cancel')}
        </button>
        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          className="rounded-sm bg-expense-strong px-2.5 py-1 text-xs font-medium text-white transition-colors duration-100 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-expense-strong"
        >
          {confirmLabel ?? t('confirm.delete')}
        </button>
      </div>
    </div>
  );
}
