import { PERIODS, type Period } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { SegmentedControl } from '../../../components/ui/SegmentedControl.tsx';

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const { t } = useI18n();
  const options = PERIODS.map((period) => ({ value: period, label: t(`period.${period}`) }));
  return (
    <SegmentedControl options={options} value={value} onChange={onChange} ariaLabel={t('nav.list')} />
  );
}
