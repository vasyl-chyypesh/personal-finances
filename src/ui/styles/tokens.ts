/**
 * Design tokens — the single TypeScript source of truth for the design system.
 *
 * These values are mirrored into Tailwind utilities via the `@theme` block in
 * `src/ui/index.css` (Tailwind v4 is CSS-first; there is no `tailwind.config.ts`).
 * Import from here only when a value is needed in TS/JS (e.g. deriving a
 * category color, an inline SVG fill); prefer Tailwind classes in markup.
 */

/**
 * Financial semantic colors. `bg` for soft backgrounds/badges, `text` for
 * WCAG-AA foreground on that bg, `strong` for solid fills / emphasis.
 */
export const colors = {
  // Transactions
  income: { bg: '#EAF3DE', text: '#3B6D11', strong: '#639922' },
  expense: { bg: '#FCEBEB', text: '#A32D2D', strong: '#E24B4A' },
  pending: { bg: '#FAEEDA', text: '#854F0B', strong: '#EF9F27' },
  transfer: { bg: '#E6F1FB', text: '#185FA5', strong: '#378ADD' },

  // Primary UI
  primary: '#185FA5', // actions, links, selected state
  primaryHover: '#14528F',
  primaryActive: '#0F4576',
  accent: '#3C3489', // charts, secondary highlights

  // Neutrals
  neutral: {
    50: '#F1EFE8',
    200: '#B4B2A9',
    500: '#888780',
    800: '#444441',
  },

  white: '#FFFFFF',
} as const;

export const fontFamily = {
  sans: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace", // amounts & currency codes only
} as const;

/** Type scale in px. Weights are restricted to 400/500 — never 600/700. */
export const fontSize = {
  '2xs': '11px',
  xs: '12px',
  sm: '13px',
  base: '14px',
  md: '16px',
  lg: '18px',
  xl: '22px',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
} as const;

/** 4px base spacing scale. */
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  12: '48px',
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  pill: '9999px',
} as const;

export const transition = {
  fast: '100ms ease',
  base: '150ms ease',
  slow: '200ms ease',
} as const;

/** Borders are intentionally lighter than Tailwind's 1px default. */
export const border = {
  hairline: '0.5px',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sidepanel: 20,
  tooltip: 30,
} as const;

export type TransactionTone = 'income' | 'expense' | 'pending' | 'transfer';
