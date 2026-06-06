import { useState } from 'react';
import { CategoryForm } from '../components/CategoryForm.tsx';
import { CategoryList } from '../components/CategoryList.tsx';
import { useManageCategories } from '../hooks/useManageCategories.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import type { Category, CreateCategoryDto, LocalizedName } from '../../../types.ts';

export function CategoriesPage() {
  const { t } = useI18n();
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { categories, loading, error, create, updateNames, remove, restore, reorder } =
    useManageCategories(showDeleted);

  async function handleCreate(dto: CreateCategoryDto) {
    await create(dto);
  }

  async function handleUpdate(id: number, names: LocalizedName) {
    await updateNames(id, names);
    setEditing(null);
  }

  async function handleDelete(id: number) {
    if (!confirm(t('categories.deleteConfirm'))) {
      return;
    }
    if (editing?.id === id) {
      setEditing(null);
    }
    await remove(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <CategoryForm
          editing={editing}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancelEdit={() => setEditing(null)}
        />
      </div>

      <div className="mb-4 flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          {t('categories.showDeleted')}
        </label>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <CategoryList
        categories={categories}
        loading={loading}
        reorderable={!showDeleted}
        onEdit={setEditing}
        onDelete={handleDelete}
        onRestore={restore}
        onReorder={reorder}
      />
    </div>
  );
}
