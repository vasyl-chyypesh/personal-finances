import type { Locale, LocalizedName } from './categories.types.js';

export interface CategoryDef {
  slug: string;
  names: Required<LocalizedName>;
}

/**
 * Canonical set of known categories with bilingual names. The `uk` value matches
 * the normalized label produced by the xls parser, so the importer maps file rows
 * onto these slugs instead of creating duplicates. This list is also the seed set.
 */
export const CATEGORY_CATALOG: CategoryDef[] = [
  { slug: 'charity', names: { en: 'Charity', uk: 'Благодійність' } },
  { slug: 'alcohol-tobacco', names: { en: 'Alcohol, tobacco', uk: 'Алкоголь, цигарки' } },
  { slug: 'medicine', names: { en: 'Pharmacy & medicine', uk: 'Аптека, лікування' } },
  { slug: 'footwear', names: { en: 'Footwear', uk: 'Взуття' } },
  { slug: 'vacation', names: { en: 'Vacation (travel)', uk: 'Відпочинок (подорожі)' } },
  { slug: 'hygiene', names: { en: 'Hygiene', uk: 'Гігієна' } },
  { slug: 'pets', names: { en: 'Pets', uk: 'Домашні тварини' } },
  { slug: 'communication', names: { en: 'Communication', uk: 'Звязок' } },
  { slug: 'stationery', names: { en: 'Stationery', uk: 'Канцтовари' } },
  { slug: 'utilities', names: { en: 'Utilities', uk: 'Комунальні платежі' } },
  { slug: 'electricity', names: { en: 'Electricity', uk: 'Електроенергія' } },
  { slug: 'gas', names: { en: 'Gas', uk: 'Газ' } },
  { slug: 'water', names: { en: 'Water', uk: 'Вода' } },
  { slug: 'internet', names: { en: 'Internet', uk: 'Інет' } },
  { slug: 'cosmetics', names: { en: 'Cosmetics', uk: 'Косметика' } },
  { slug: 'loan', names: { en: 'Loan', uk: 'Кредит' } },
  { slug: 'literature-press', names: { en: 'Literature, press', uk: 'Література, преса' } },
  { slug: 'education', names: { en: 'Education', uk: 'Навчання' } },
  { slug: 'clothing', names: { en: 'Clothing', uk: 'Одяг' } },
  { slug: 'electronics', names: { en: 'Office equipment', uk: 'Оргтехніка, фото, відео' } },
  { slug: 'rent', names: { en: 'Rent', uk: 'Оренда житла' } },
  { slug: 'repair', names: { en: 'Repair', uk: 'Ремонт' } },
  { slug: 'wages', names: { en: 'Wages paid', uk: 'Оплата праці' } },
  { slug: 'services', names: { en: 'Services', uk: 'Оплата послуг' } },
  { slug: 'household-chemicals', names: { en: 'Household chemicals', uk: 'Побутова хімія' } },
  { slug: 'gifts', names: { en: 'Gifts', uk: 'Подарунки' } },
  { slug: 'celebration', names: { en: 'Celebration', uk: 'Святкування' } },
  { slug: 'grocery', names: { en: 'Groceries', uk: 'Продукти харчування' } },
  { slug: 'entertainment', names: { en: 'Entertainment', uk: 'Розваги' } },
  { slug: 'sport', names: { en: 'Sport', uk: 'Спорт' } },
  { slug: 'dentistry', names: { en: 'Dentistry', uk: 'Стоматологія' } },
  { slug: 'household-goods', names: { en: 'Household goods', uk: 'Товари для дому' } },
  { slug: 'transport', names: { en: 'Transport', uk: 'Транспортні витрати' } },
  { slug: 'eating-out', names: { en: 'Eating out', uk: 'Харчування поза домом' } },
  { slug: 'investments', names: { en: 'Investments', uk: 'Інвестиції' } },
  { slug: 'salary', names: { en: 'Salary (Codify Stigg)', uk: 'Зарплата Codify Stigg' } },
  { slug: 'side-project', names: { en: 'Side projects', uk: 'Додаткові проекти' } },
  {
    slug: 'rental-income',
    names: { en: 'Rental utilities (Mozhayskoho 5)', uk: 'Можайського 5 комуналка' },
  },
  { slug: 'deposits', names: { en: 'Deposits, securities', uk: 'Депозити, Цінні папери' } },
  { slug: 'cashback', names: { en: 'Cashback', uk: 'Кешбек' } },
  { slug: 'forex', names: { en: 'Forex', uk: 'Форекс' } },
];

const CATALOG_BY_LOCALE_NAME = new Map<string, CategoryDef>();
for (const def of CATEGORY_CATALOG) {
  for (const [locale, name] of Object.entries(def.names)) {
    CATALOG_BY_LOCALE_NAME.set(`${locale}:${name.toLowerCase()}`, def);
  }
}

/** Builds a language-neutral slug from an arbitrary label. */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a localized label to a catalog category (slug + bilingual names) when
 * known, otherwise to a single-locale custom category derived from the label.
 */
export function resolveCategory(
  label: string,
  locale: Locale,
): { slug: string; names: LocalizedName } {
  const match = CATALOG_BY_LOCALE_NAME.get(`${locale}:${label.toLowerCase()}`);
  if (match) {
    return { slug: match.slug, names: { ...match.names } };
  }
  return { slug: slugify(label), names: { [locale]: label } };
}
