import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { centsToMajor, majorToCents } from '../lib/money.ts';
import { Button } from './Button.tsx';
import { ConfirmTooltip } from './ConfirmTooltip.tsx';
import { CloseIcon } from './icons.tsx';
import { CURRENCIES } from '../types.ts';
import type {
  Category,
  CreateLedgerEntryDto,
  Currency,
  LedgerEntry,
  LedgerEntryType,
} from '../types.ts';

export interface RecordSidePanelProps {
  open: boolean;
  /** null = create mode. */
  record: LedgerEntry | null;
  categories: Category[];
  /** ISO date prefilled in create mode. */
  defaultDate?: string;
  /** Prefill for create mode (e.g. opened from a calendar cell). */
  createDefaults?: { categoryId?: number; date?: string; type?: LedgerEntryType };
  saving?: boolean;
  onSave: (dto: CreateLedgerEntryDto, id?: number) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
  onClose: () => void;
}

interface FormState {
  type: LedgerEntryType;
  amount: string;
  currency: Currency;
  categoryId: string;
  date: string;
  description: string;
}

function seed(
  record: LedgerEntry | null,
  fallbackDate: string,
  createDefaults?: RecordSidePanelProps['createDefaults'],
): FormState {
  if (record) {
    return {
      type: record.type,
      amount: String(centsToMajor(record.amount)),
      currency: record.currency,
      categoryId: String(record.category.id),
      date: record.date,
      description: record.description ?? '',
    };
  }
  return {
    type: createDefaults?.type ?? 'expense',
    amount: '',
    currency: 'UAH',
    categoryId: createDefaults?.categoryId != null ? String(createDefaults.categoryId) : '',
    date: createDefaults?.date ?? fallbackDate,
    description: '',
  };
}

const labelClass = 'block text-xs font-medium text-fg-muted';
const inputClass =
  'mt-1 w-full rounded-md border-hairline border-line bg-surface px-3 py-2 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary';

export function RecordSidePanel({
  open,
  record,
  categories,
  defaultDate,
  createDefaults,
  saving = false,
  onSave,
  onDelete,
  onClose,
}: RecordSidePanelProps) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<FormState>(() => seed(record, today, createDefaults));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  // The control that had focus before the panel opened, so we can restore it on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  // Re-seed whenever the panel opens or targets a different record.
  useEffect(() => {
    if (open) {
      setForm(seed(record, today, createDefaults));
      setError(null);
      setConfirming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed only on open/record change
  }, [open, record?.id]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      firstFieldRef.current?.focus();
    } else {
      // Return focus to the trigger so keyboard users land where they left off.
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(t('form.errAmount'));
      return;
    }
    if (!form.categoryId) {
      setError(t('form.errCategory'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError(t('form.errDate'));
      return;
    }
    setError(null);
    const dto: CreateLedgerEntryDto = {
      type: form.type,
      amount: majorToCents(amountNum),
      currency: form.currency,
      categoryId: Number(form.categoryId),
      date: form.date,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };
    await onSave(dto, record?.id);
  };

  return (
    <div
      className={`fixed inset-0 z-20 ${open ? '' : 'pointer-events-none'}`}
      inert={!open ? true : undefined}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel — stays mounted; slides via transform so list state is preserved. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-surface shadow-xl transition-transform duration-200 ease-base ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b-hairline border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-medium text-fg">
            {record ? t('panel.editTitle') : t('panel.addTitle')}
          </h2>
          <button
            ref={firstFieldRef}
            type="button"
            aria-label={t('panel.close')}
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {/* Type */}
            <div>
              <span className={labelClass}>{t('form.type')}</span>
              <div className="mt-1 inline-flex overflow-hidden rounded-md border-hairline border-line">
                {(['expense', 'income'] as const).map((ty) => {
                  const active = form.type === ty;
                  return (
                    <button
                      key={ty}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set('type', ty)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                        active
                          ? ty === 'income'
                            ? 'bg-income-strong text-white'
                            : 'bg-expense-strong text-white'
                          : 'bg-surface text-fg-muted hover:bg-surface-muted'
                      }`}
                    >
                      {ty === 'income' ? t('type.income') : t('type.expense')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount + currency */}
            <div className="flex gap-3">
              <label className="flex-1">
                <span className={labelClass}>{t('form.amount')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="w-28">
                <span className={labelClass}>{t('form.currency')}</span>
                <select
                  value={form.currency}
                  onChange={(e) => set('currency', e.target.value as Currency)}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Category */}
            <label className="block">
              <span className={labelClass}>{t('form.category')}</span>
              <select
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className={inputClass}
              >
                <option value="">{t('form.categoryPlaceholder')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(c, locale)}
                  </option>
                ))}
              </select>
            </label>

            {/* Date */}
            <label className="block">
              <span className={labelClass}>{t('form.date')}</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={inputClass}
              />
            </label>

            {/* Description */}
            <label className="block">
              <span className={labelClass}>{t('form.description')}</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={t('form.descriptionPlaceholder')}
                className={inputClass}
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-md bg-expense-bg px-3 py-2 text-sm text-expense-text"
              >
                {error}
              </p>
            ) : null}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t-hairline border-line px-5 py-4">
            <div className="relative">
              {record && onDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-expense-text transition-colors duration-100 hover:bg-expense-bg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-expense-strong"
                  >
                    {t('panel.delete')}
                  </button>
                  <ConfirmTooltip
                    open={confirming}
                    placement="top-right"
                    message={t('app.deleteConfirm')}
                    onConfirm={() => {
                      setConfirming(false);
                      void onDelete(record.id);
                    }}
                    onCancel={() => setConfirming(false)}
                  />
                </>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t('panel.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {t('panel.save')}
              </Button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
