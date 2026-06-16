import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { useElementWidth } from '../hooks/useElementWidth.ts';
import { niceScale, tickIndices, nearestIndex, monthStartIndices } from '../lib/chartScale.ts';
import { colors } from '../styles/tokens.ts';
import { QUOTE_CURRENCIES } from '../types.ts';
import type { QuoteCurrency, RateHistoryPoint } from '../types.ts';

export interface RateHistoryChartProps {
  series: RateHistoryPoint[];
  base: string;
  /** Currencies to draw; others are dimmed in the legend. */
  visible: QuoteCurrency[];
  /** Toggle a series from the legend. Omit for a static chart. */
  onToggle?: (currency: QuoteCurrency) => void;
}

const HEIGHT = 200;
const PAD = { top: 12, right: 16, bottom: 24, left: 48 };
const Y_TICKS = 5;
const X_TICKS = 6;

/** Color per quote currency, drawn from the design tokens. */
const SERIES_COLOR: Record<QuoteCurrency, string> = {
  USD: colors.primary,
  EUR: colors.accent,
};

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/** Lightweight, dependency-free line chart of base-per-unit rates over time. */
export function RateHistoryChart({ series, base, visible, onToggle }: RateHistoryChartProps) {
  const { t, locale } = useI18n();
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const visibleSet = new Set(visible);

  /* eslint-disable security/detect-object-injection -- currency is a typed QuoteCurrency literal */
  const values = series.flatMap((p) =>
    QUOTE_CURRENCIES.filter((c) => visibleSet.has(c)).map((c) => p.rates[c]),
  );
  const scale = niceScale(Math.min(...values), Math.max(...values), Y_TICKS);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const ySpan = scale.niceMax - scale.niceMin || 1;

  const x = (i: number) =>
    PAD.left + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - scale.niceMin) / ySpan) * plotH;

  const lines = QUOTE_CURRENCIES.map((currency) => ({
    currency,
    color: SERIES_COLOR[currency],
    active: visibleSet.has(currency),
    points: series.map((p, i) => `${x(i)},${y(p.rates[currency])}`).join(' '),
  }));
  /* eslint-enable security/detect-object-injection */

  const spanDays = daysBetween(series[0]?.date ?? '', series.at(-1)?.date ?? '');
  const xDateFmt = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions =
      spanDays <= 35
        ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
        : spanDays <= 120
          ? { month: 'short', timeZone: 'UTC' }
          : { month: 'short', year: '2-digit', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(locale, opts);
  }, [locale, spanDays]);
  const yFmt = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const tipFmt = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
    [locale],
  );
  const fmtXDate = (iso: string) => xDateFmt.format(new Date(`${iso}T00:00:00Z`));

  // Short ranges tick by evenly spaced days; longer ranges snap to month
  // starts (thinned to ~X_TICKS) so month labels never repeat.
  const xTickIdx = useMemo(() => {
    if (spanDays <= 35) return tickIndices(series.length, X_TICKS);
    const months = monthStartIndices(series.map((p) => p.date));
    if (months.length <= X_TICKS + 1) return months;
    // eslint-disable-next-line security/detect-object-injection -- j indexes within months
    return tickIndices(months.length, X_TICKS + 1).map((j) => months[j]!);
  }, [series, spanDays]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left - PAD.left) / (plotW || 1);
    setHover(nearestIndex(fraction, series.length));
  };

  /* eslint-disable security/detect-object-injection -- index/currency are bounded literals */
  const hoverPoint = hover != null ? series[hover] : undefined;
  const hoverX = hover != null ? x(hover) : 0;
  const flip = hoverX > width / 2;
  const hoverDots = hoverPoint
    ? lines
        .filter((line) => line.active)
        .map((line) => ({
          currency: line.currency,
          color: line.color,
          cy: y(hoverPoint.rates[line.currency]),
          label: t('currencies.rateValue', {
            quote: line.currency,
            value: tipFmt.format(hoverPoint.rates[line.currency]),
            base,
          }),
        }))
    : [];
  /* eslint-enable security/detect-object-injection */

  return (
    <div>
      <div ref={wrapRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 ? (
          <>
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={t('currencies.chartTitle')}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {/* Y gridlines + value labels */}
              {scale.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    y1={y(tick)}
                    x2={width - PAD.right}
                    y2={y(tick)}
                    className="stroke-line"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 6}
                    y={y(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-fg-subtle text-[10px]"
                  >
                    {yFmt.format(tick)}
                  </text>
                </g>
              ))}

              {/* X date labels */}
              {xTickIdx.map((i) => {
                // eslint-disable-next-line security/detect-object-injection -- i is a bounded tick index
                const point = series[i];
                if (!point) return null;
                const anchor = i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle';
                return (
                  <text
                    key={point.date}
                    x={x(i)}
                    y={HEIGHT - 8}
                    textAnchor={anchor}
                    className="fill-fg-subtle text-[10px]"
                  >
                    {fmtXDate(point.date)}
                  </text>
                );
              })}

              {/* Series */}
              {lines
                .filter((line) => line.active)
                .map((line) => (
                  <polyline
                    key={line.currency}
                    points={line.points}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

              {/* Hover crosshair + dots */}
              {hoverPoint ? (
                <>
                  <line
                    x1={hoverX}
                    y1={PAD.top}
                    x2={hoverX}
                    y2={PAD.top + plotH}
                    className="stroke-fg-subtle"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {hoverDots.map((dot) => (
                    <circle
                      key={dot.currency}
                      cx={hoverX}
                      cy={dot.cy}
                      r={3.5}
                      fill={dot.color}
                      className="stroke-surface"
                      strokeWidth={1.5}
                    />
                  ))}
                </>
              ) : null}
            </svg>

            {hoverPoint ? (
              <div
                className="pointer-events-none absolute z-10 rounded-md border-hairline border-line bg-surface px-2 py-1.5 text-2xs shadow-md"
                style={{
                  left: hoverX,
                  top: PAD.top,
                  transform: flip ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
                }}
              >
                <div className="mb-1 font-medium text-fg-muted">{hoverPoint.date}</div>
                {hoverDots.map((dot) => (
                  <div key={dot.currency} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: dot.color }}
                    />
                    <span className="text-fg">{dot.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        {lines.map((line) => (
          <button
            key={line.currency}
            type="button"
            aria-pressed={line.active}
            onClick={() => onToggle?.(line.currency)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md border-hairline border-line px-2 py-1 text-xs transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              line.active ? 'text-fg-muted' : 'text-fg-subtle'
            }`}
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={
                line.active
                  ? { backgroundColor: line.color }
                  : { border: `1.5px solid ${line.color}` }
              }
            />
            <span className={line.active ? undefined : 'line-through'}>
              {t('currencies.perUnit', { quote: line.currency, base })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
