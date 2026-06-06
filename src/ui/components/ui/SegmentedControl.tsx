import { segmentGroupClass, segmentItemClass, type SegmentSize } from './segmented.ts';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Selectable segments. */
  options: readonly SegmentOption<T>[];
  /** Currently selected value. */
  value: T;
  /** Called with the newly selected value. */
  onChange: (value: T) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  size?: SegmentSize;
}

/** A single-select pill group. Generic over the option value union. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={segmentGroupClass}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={segmentItemClass(value === option.value, size)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
