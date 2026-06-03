import { useEffect, useState, type FormEvent } from 'react';
import {
  CURRENCIES,
  LEDGER_TYPES,
  type Category,
  type CreateLedgerEntryDto,
  type Currency,
  type LedgerEntry,
  type LedgerEntryType,
} from '../types.ts';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';

/** Prefilled values for the "add" form (ignored while editing). */
export interface LedgerFormDefaults {
  type?: LedgerEntryType;
  categoryId?: number;
  date?: string;
}

interface LedgerFormProps {
  categories: Category[];
  editing: LedgerEntry | null;
  onCreate: (dto: CreateLedgerEntryDto) => Promise<void>;
  onUpdate: (id: number, dto: CreateLedgerEntryDto) => Promise<void>;
  onCancelEdit: () => void;
  defaults?: LedgerFormDefaults;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  type: LedgerEntryType;
  amount: string;
  currency: Currency;
  categoryId: string;
  description: string;
  date: string;
}

function emptyState(defaults?: LedgerFormDefaults): FormState {
  return {
    type: defaults?.type ?? 'expense',
    amount: '',
    currency: 'UAH',
    categoryId: defaults?.categoryId !== undefined ? String(defaults.categoryId) : '',
    description: '',
    date: defaults?.date ?? today(),
  };
}

function stateFromEntry(entry: LedgerEntry): FormState {
  return {
    type: entry.type,
    amount: String(entry.amount),
    currency: entry.currency,
    categoryId: String(entry.category.id),
    description: entry.description ?? '',
    date: entry.date,
  };
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-600';

export function LedgerForm({
  categories,
  editing,
  onCreate,
  onUpdate,
  onCancelEdit,
  defaults,
}: LedgerFormProps) {
  const { locale, t } = useI18n();
  const [form, setForm] = useState<FormState>(() => emptyState(defaults));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultsKey = `${defaults?.type ?? ''}|${defaults?.categoryId ?? ''}|${defaults?.date ?? ''}`;
  useEffect(() => {
    setForm(editing ? stateFromEntry(editing) : emptyState(defaults));
    setError(null);
    // defaultsKey captures the defaults object's relevant fields without re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, defaultsKey]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('form.errAmount'));
      return;
    }
    const categoryId = Number(form.categoryId);
    if (!categoryId) {
      setError(t('form.errCategory'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError(t('form.errDate'));
      return;
    }

    const dto: CreateLedgerEntryDto = {
      type: form.type,
      amount,
      currency: form.currency,
      categoryId,
      date: form.date,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await onUpdate(editing.id, dto);
      } else {
        await onCreate(dto);
        setForm(emptyState(defaults));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('form.errGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        {editing ? t('form.editTitle', { id: editing.id }) : t('form.addTitle')}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="type">
            {t('form.type')}
          </label>
          <select
            id="type"
            className={inputClass}
            value={form.type}
            onChange={(e) => set('type', e.target.value as LedgerEntryType)}
          >
            {LEDGER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`type.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="category">
            {t('form.category')}
          </label>
          <select
            id="category"
            className={inputClass}
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">{t('form.categoryPlaceholder')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, locale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="amount">
            {t('form.amount')}
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="currency">
            {t('form.currency')}
          </label>
          <select
            id="currency"
            className={inputClass}
            value={form.currency}
            onChange={(e) => set('currency', e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="date">
            {t('form.date')}
          </label>
          <input
            id="date"
            type="date"
            className={inputClass}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="description">
            {t('form.description')}
          </label>
          <input
            id="description"
            type="text"
            className={inputClass}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
          />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {editing ? t('form.submitSave') : t('form.submitAdd')}
        </button>
        {editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {t('form.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
