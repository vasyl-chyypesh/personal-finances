import { useState } from 'react';
import { CategoryForm } from '../components/CategoryForm.tsx';
import { CategoryList } from '../components/CategoryList.tsx';
import { useManageCategories } from '../hooks/useManageCategories.ts';
import { useEditableList } from '../../../hooks/useEditableList.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { Alert } from '../../../components/ui/Alert.tsx';
import type { Category, LocalizedName } from '../../../types.ts';

export function CategoriesPage() {
  const { t } = useI18n();
  const [showDeleted, setShowDeleted] = useState(false);

  const { categories, loading, error, create, updateNames, remove, restore, reorder } =
    useManageCategories(showDeleted);
  const { editing, setEditing, stopEditing, confirmDelete } = useEditableList<Category>(
    remove,
    t('categories.deleteConfirm'),
  );

  async function handleUpdate(id: number, names: LocalizedName) {
    await updateNames(id, names);
    stopEditing();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <CategoryForm
          editing={editing}
          onCreate={create}
          onUpdate={handleUpdate}
          onCancelEdit={stopEditing}
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

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <CategoryList
        categories={categories}
        loading={loading}
        reorderable={!showDeleted}
        onEdit={setEditing}
        onDelete={confirmDelete}
        onRestore={restore}
        onReorder={reorder}
      />
    </div>
  );
}
