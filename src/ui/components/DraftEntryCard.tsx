import { useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { centsToMajor, majorToCents } from '../lib/money.ts';
import { AmountDisplay } from './AmountDisplay.tsx';
import { CheckIcon } from './icons.tsx';
import { CURRENCIES } from '../types.ts';
import type {
  Category,
  ChatExtractResult,
  CreateLedgerEntryDto,
  Currency,
  LedgerEntry,
  LedgerEntryType,
  UncertainField,
} from '../types.ts';

export interface DraftEntryCardProps {
  result: ChatExtractResult;
  categories: Category[];
  /** Set once the draft has been confirmed and saved. */
  saved?: LedgerEntry;
  onConfirm: (dto: CreateLedgerEntryDto) => Promise<void>;
}

interface FormState {
  type: LedgerEntryType;
  amount: string;
  currency: Currency;
  categoryId: string;
  date: string;
  description: string;
}

function seed(result: ChatExtractResult): FormState {
  const d = result.draft;
  return {
    type: d.type,
    amount: d.amount > 0 ? String(centsToMajor(d.amount)) : '',
    currency: d.currency,
    categoryId: d.categoryId != null ? String(d.categoryId) : '',
    date: d.date,
    description: d.description ?? '',
  };
}

const labelClass = 'flex items-center gap-1.5 text-xs font-medium text-fg-muted';
const inputClass =
  'mt-1 w-full rounded-md border-hairline bg-surface px-3 py-2 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary';

/** Border highlight for fields the model defaulted or was unsure about. */
function fieldBorder(uncertain: boolean): string {
  return uncertain ? 'border-primary' : 'border-line';
}

export function DraftEntryCard({ result, categories, saved, onConfirm }: DraftEntryCardProps) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState<FormState>(() => seed(result));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const uncertain = new Set<UncertainField>(result.uncertainFields);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Confirmed: show a compact, read-only summary instead of the editable form.
  if (saved) {
    const category = categories.find((c) => c.id === saved.category.id) ?? saved.category;
    return (
      <div className="rounded-lg border-hairline border-income-strong/40 bg-income-bg/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-income-text">
          <CheckIcon size={16} />
          <span>{t('chat.saved')}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-fg">{categoryName(category, locale)}</span>
          <AmountDisplay
            amount={saved.amount}
            currency={saved.currency}
            type={saved.type}
            size="sm"
          />
        </div>
        <p className="mt-1 text-xs text-fg-muted">{saved.date}</p>
      </div>
    );
  }

  const confirm = async () => {
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
    setSaving(true);
    const dto: CreateLedgerEntryDto = {
      type: form.type,
      amount: majorToCents(amountNum),
      currency: form.currency,
      categoryId: Number(form.categoryId),
      date: form.date,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };
    try {
      await onConfirm(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.errGeneric'));
      setSaving(false);
    }
  };

  const verifyBadge = (field: UncertainField) =>
    uncertain.has(field) ? (
      <span className="rounded bg-primary-soft px-1 py-px text-2xs font-medium text-primary">
        {t('chat.verify')}
      </span>
    ) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void confirm();
      }}
      className="space-y-3 rounded-lg border-hairline border-line bg-surface p-4"
    >
      {/* Type */}
      <div>
        <span className={labelClass}>
          {t('form.type')}
          {verifyBadge('type')}
        </span>
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
          <span className={labelClass}>
            {t('form.amount')}
            {verifyBadge('amount')}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={`${inputClass} font-mono ${fieldBorder(uncertain.has('amount'))}`}
          />
        </label>
        <label className="w-28">
          <span className={labelClass}>
            {t('form.currency')}
            {verifyBadge('currency')}
          </span>
          <select
            value={form.currency}
            onChange={(e) => set('currency', e.target.value as Currency)}
            className={`${inputClass} ${fieldBorder(uncertain.has('currency'))}`}
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
        <span className={labelClass}>
          {t('form.category')}
          {verifyBadge('category')}
        </span>
        <select
          value={form.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          className={`${inputClass} ${fieldBorder(!form.categoryId)}`}
        >
          <option value="">{t('form.categoryPlaceholder')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryName(c, locale)}
            </option>
          ))}
        </select>
        {result.unresolvedCategory && !form.categoryId ? (
          <span className="mt-1 block text-xs text-primary">{t('chat.pickCategory')}</span>
        ) : null}
      </label>

      {/* Date */}
      <label className="block">
        <span className={labelClass}>
          {t('form.date')}
          {verifyBadge('date')}
        </span>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className={`${inputClass} ${fieldBorder(uncertain.has('date'))}`}
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
          className={`${inputClass} border-line`}
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-md bg-expense-bg px-3 py-2 text-sm text-expense-text">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t('chat.confirm')}
        </button>
      </div>
    </form>
  );
}
