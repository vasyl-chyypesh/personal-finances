import { useEffect, useState, type FormEvent } from 'react';
import {
  CURRENCIES,
  LEDGER_TYPES,
  type Category,
  type CreateLedgerEntryDto,
  type Currency,
  type LedgerEntry,
  type LedgerEntryType,
} from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { categoryName } from '../../../i18n/categoryName.ts';
import { centsToMajor, majorToCents } from '../../../lib/money.ts';
import { Field } from '../../../components/ui/Field.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { Select } from '../../../components/ui/Select.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Alert } from '../../../components/ui/Alert.tsx';
import { Spinner } from '../../../components/ui/Spinner.tsx';

/** Prefilled values for the "add" form (ignored while editing). */
export interface LedgerFormDefaults {
  type?: LedgerEntryType;
  categoryId?: number;
  date?: string;
}

export interface LedgerFormProps {
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
    amount: String(centsToMajor(entry.amount)),
    currency: entry.currency,
    categoryId: String(entry.category.id),
    description: entry.description ?? '',
    date: entry.date,
  };
}

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
      amount: majorToCents(amount),
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
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-fg">
        {editing ? t('form.editTitle', { id: editing.id }) : t('form.addTitle')}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field htmlFor="type" label={t('form.type')}>
          <Select
            id="type"
            value={form.type}
            onChange={(e) => set('type', e.target.value as LedgerEntryType)}
          >
            {LEDGER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`type.${type}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="category" label={t('form.category')}>
          <Select
            id="category"
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">{t('form.categoryPlaceholder')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, locale)}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="amount" label={t('form.amount')}>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
          />
        </Field>

        <Field htmlFor="currency" label={t('form.currency')}>
          <Select
            id="currency"
            value={form.currency}
            onChange={(e) => set('currency', e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="date" label={t('form.date')}>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </Field>

        <Field htmlFor="description" label={t('form.description')}>
          <Input
            id="description"
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
          />
        </Field>
      </div>

      {error ? (
        <Alert className="mt-3" tone="error">
          {error}
        </Alert>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {editing ? t('form.submitSave') : t('form.submitAdd')}
        </Button>
        {editing ? (
          <Button type="button" variant="secondary" onClick={onCancelEdit}>
            {t('form.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
