import { useEffect, useState, type FormEvent } from 'react';
import type { Category, CreateCategoryDto, LocalizedName } from '../types.ts';
import { useI18n } from '../i18n/i18nContext.ts';

interface CategoryFormProps {
  editing: Category | null;
  onCreate: (dto: CreateCategoryDto) => Promise<void>;
  onUpdate: (id: number, names: LocalizedName) => Promise<void>;
  onCancelEdit: () => void;
}

interface FormState {
  en: string;
  uk: string;
}

function stateFromCategory(category: Category): FormState {
  return { en: category.names.en ?? '', uk: category.names.uk ?? '' };
}

const EMPTY_STATE: FormState = { en: '', uk: '' };

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-600';

export function CategoryForm({ editing, onCreate, onUpdate, onCancelEdit }: CategoryFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(editing ? stateFromCategory(editing) : EMPTY_STATE);
    setError(null);
  }, [editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const en = form.en.trim();
    const uk = form.uk.trim();
    if (!en && !uk) {
      setError(t('categories.errName'));
      return;
    }

    const names: LocalizedName = {
      ...(en ? { en } : {}),
      ...(uk ? { uk } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await onUpdate(editing.id, names);
      } else {
        await onCreate({ names });
        setForm(EMPTY_STATE);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('categories.errGeneric'));
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
        {editing ? t('categories.editTitle', { slug: editing.slug }) : t('categories.addTitle')}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name-en">
            {t('categories.nameEn')}
          </label>
          <input
            id="name-en"
            type="text"
            className={inputClass}
            value={form.en}
            onChange={(e) => set('en', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="name-uk">
            {t('categories.nameUk')}
          </label>
          <input
            id="name-uk"
            type="text"
            className={inputClass}
            value={form.uk}
            onChange={(e) => set('uk', e.target.value)}
          />
        </div>
      </div>

      {editing ? (
        <p className="mt-3 text-xs text-slate-500">
          {t('categories.slug')}: <span className="font-mono">{editing.slug}</span>
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {editing ? t('categories.submitSave') : t('categories.submitAdd')}
        </button>
        {editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {t('categories.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
