export type SegmentSize = 'sm' | 'md';

/** Wrapper styling for a pill group (shared with route-based nav). */
export const segmentGroupClass =
  'inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm';

/** Per-segment styling. Exported so route `NavLink`s can match the pill look. */
export const segmentItemClass = (active: boolean, size: SegmentSize = 'md'): string => {
  const sizing =
    size === 'sm' ? 'px-2.5 py-1 text-xs font-semibold' : 'px-3 py-1.5 text-sm font-medium';
  const state = active ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100';
  return `rounded-md transition-colors ${sizing} ${state}`;
};
