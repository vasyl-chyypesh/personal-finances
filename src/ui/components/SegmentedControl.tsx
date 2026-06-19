import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SEG_SIZES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
} as const;

/**
 * Crisp/minimal segmented control: one muted track, the active segment lifts
 * onto a plain surface with a subtle shadow (neutral, not the blue accent).
 * Shared by the period, type-filter, view, and rate-range switchers.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  // eslint-disable-next-line security/detect-object-injection -- typed union key
  const sizeClass = SEG_SIZES[size];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-md bg-surface-muted p-0.5 ${className}`.trim()}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-sm font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${sizeClass} ${
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
