import { NavLink, Navigate, Route, Routes } from 'react-router';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';
import { ListPage } from '../features/ledger/pages/ListPage.tsx';
import { TablePage } from '../features/ledger/pages/TablePage.tsx';
import { CategoriesPage } from '../features/categories/pages/CategoriesPage.tsx';
import { useI18n } from '../i18n/i18nContext.ts';
import { segmentGroupClass, segmentItemClass } from '../components/ui/segmented.ts';

const navClass = ({ isActive }: { isActive: boolean }): string => segmentItemClass(isActive);

export default function App() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('app.title')}</h1>
            <p className="text-sm text-slate-500">{t('app.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <nav className={`mb-6 ${segmentGroupClass}`}>
          <NavLink to="/list" className={navClass}>
            {t('nav.list')}
          </NavLink>
          <NavLink to="/table" className={navClass}>
            {t('nav.table')}
          </NavLink>
          <NavLink to="/categories" className={navClass}>
            {t('nav.categories')}
          </NavLink>
        </nav>

        <Routes>
          <Route path="/list" element={<ListPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*" element={<Navigate to="/list" replace />} />
        </Routes>
      </div>
    </div>
  );
}
