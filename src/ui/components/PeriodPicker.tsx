import { useI18n } from '../i18n/i18nContext.ts';
import { formatPeriodLabel, shiftPeriod } from '../lib/datePeriod.ts';
import { SegmentedControl } from './SegmentedControl.tsx';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

export interface PeriodPickerProps {
  period: 'week' | 'month';
  onPeriodChange: (p: 'week' | 'month') => void;
  date: Date;
  onDateChange: (d: Date) => void;
  /** Hide the week/month toggle (e.g. calendar view is month-only). */
  hideGranularity?: boolean;
  className?: string;
}

/**
 * Period selector: week/month toggle, an explicit range label, and prev/next
 * navigation (also bound to ← / → arrow keys). Week starts Monday. Range math
 * is UTC-based (see lib/datePeriod).
 */
export function PeriodPicker({
  period,
  onPeriodChange,
  date,
  onDateChange,
  hideGranularity = false,
  className = '',
}: PeriodPickerProps) {
  const { t } = useI18n();

  const go = (direction: 1 | -1) => onDateChange(shiftPeriod(period, date, direction));

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="group"
      aria-label={t('period.month')}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(1);
        }
      }}
    >
      {hideGranularity ? null : (
        <SegmentedControl
          ariaLabel={t('period.month')}
          value={period}
          onChange={onPeriodChange}
          options={[
            { value: 'week', label: t('period.week') },
            { value: 'month', label: t('period.month') },
          ]}
        />
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={t('period.prev')}
          onClick={() => go(-1)}
          className="flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <ChevronLeftIcon />
        </button>
        <span className="min-w-32 text-center text-sm font-medium text-fg tabular-nums">
          {formatPeriodLabel(period, date)}
        </span>
        <button
          type="button"
          aria-label={t('period.next')}
          onClick={() => go(1)}
          className="flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
