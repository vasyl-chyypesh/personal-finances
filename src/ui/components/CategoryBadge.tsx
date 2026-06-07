import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { categoryColor } from '../lib/categoryStyle.ts';
import type { Category } from '../types.ts';

export interface CategoryBadgeProps {
  category: Category;
  /** Render only the color dot + name without the pill chrome. */
  bare?: boolean;
  className?: string;
}

/** A category's name preceded by its derived color dot. */
export function CategoryBadge({ category, bare = false, className = '' }: CategoryBadgeProps) {
  const { locale } = useI18n();
  const name = categoryName(category, locale);
  const color = categoryColor(category.slug);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-fg ${
        bare ? '' : 'rounded-pill bg-surface-muted px-2 py-0.5'
      } ${className}`}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-pill"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
