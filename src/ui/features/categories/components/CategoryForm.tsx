import { useEffect, useState, type FormEvent } from 'react';
import type { Category, CreateCategoryDto, LocalizedName } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { Field } from '../../../components/ui/Field.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Alert } from '../../../components/ui/Alert.tsx';

export interface CategoryFormProps {
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
        <Field htmlFor="name-en" label={t('categories.nameEn')}>
          <Input id="name-en" type="text" value={form.en} onChange={(e) => set('en', e.target.value)} />
        </Field>

        <Field htmlFor="name-uk" label={t('categories.nameUk')}>
          <Input id="name-uk" type="text" value={form.uk} onChange={(e) => set('uk', e.target.value)} />
        </Field>
      </div>

      {editing ? (
        <p className="mt-3 text-xs text-slate-500">
          {t('categories.slug')}: <span className="font-mono">{editing.slug}</span>
        </p>
      ) : null}

      {error ? (
        <Alert className="mt-3" tone="error">
          {error}
        </Alert>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={submitting}>
          {editing ? t('categories.submitSave') : t('categories.submitAdd')}
        </Button>
        {editing ? (
          <Button type="button" variant="secondary" onClick={onCancelEdit}>
            {t('categories.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
