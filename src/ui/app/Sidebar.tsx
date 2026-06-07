import { NavLink } from 'react-router';
import { useI18n } from '../i18n/i18nContext.ts';
import { LOCALE_LABELS } from '../i18n/messages.ts';
import { useTheme } from './themeContext.ts';
import { CoinsIcon, LedgerIcon, TagIcon } from '../components/icons.tsx';
import type { Locale } from '../types.ts';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  labelKey: 'nav.ledger' | 'nav.categories' | 'nav.currencies';
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { to: '/ledger', labelKey: 'nav.ledger', icon: <LedgerIcon size={18} /> },
  { to: '/categories', labelKey: 'nav.categories', icon: <TagIcon size={18} /> },
  { to: '/currencies', labelKey: 'nav.currencies', icon: <CoinsIcon size={18} /> },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
    isActive ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
  }`;
}

/** Fixed left navigation. Full (240px) at ≥1024px; icon-only rail below. */
export function Sidebar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();

  const nextLocale: Locale = locale === 'en' ? 'uk' : 'en';

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r-hairline border-line bg-surface lg:w-60">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
          <CoinsIcon size={18} />
        </span>
        <span className="hidden truncate text-md font-medium text-fg lg:inline">
          {t('nav.brand')}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass} title={t(item.labelKey)}>
            <span className="shrink-0">{item.icon}</span>
            <span className="hidden lg:inline">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer controls */}
      <div className="flex flex-col gap-1 border-t-hairline border-line px-2 py-3">
        <button
          type="button"
          onClick={() => setLocale(nextLocale)}
          title={t('app.language')}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center text-2xs font-medium">
            {/* eslint-disable-next-line security/detect-object-injection -- typed union key */}
            {LOCALE_LABELS[locale]}
          </span>
          <span className="hidden lg:inline">{t('app.language')}</span>
        </button>
        <button
          type="button"
          onClick={toggle}
          title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <span aria-hidden className="shrink-0 text-base leading-none">
            {theme === 'dark' ? '☀' : '☾'}
          </span>
          <span className="hidden lg:inline">
            {theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          </span>
        </button>
      </div>
    </aside>
  );
}
