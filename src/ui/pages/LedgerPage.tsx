import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { useLedger, useLedgerRecord } from '../hooks/useLedger.ts';
import { useCategories } from '../hooks/useCategories.ts';
import { useCurrencies } from '../hooks/useCurrencies.ts';
import { useLedgerFilters } from '../hooks/useLedgerFilters.ts';
import { isWithinPeriod, toISODate } from '../lib/datePeriod.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { SummaryBar } from '../components/SummaryBar.tsx';
import { LedgerFilter } from '../components/LedgerFilter.tsx';
import { LedgerListItem } from '../components/LedgerListItem.tsx';
import { LedgerTable } from '../components/LedgerTable.tsx';
import { RecordSidePanel } from '../components/RecordSidePanel.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon, InboxIcon, PlusIcon } from '../components/icons.tsx';
import type { Currency, CreateLedgerEntryDto, LedgerEntry } from '../types.ts';

const segBase =
  'px-3 py-1 text-xs font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

export function LedgerPage() {
  const { t } = useI18n();
  const {
    period,
    date: anchor,
    type: typeFilter,
    categoryIds,
    view,
    sort,
    setPeriod,
    setDate,
    setType,
    setCategoryIds,
    setView,
    setSort,
  } = useLedgerFilters();

  const [panel, setPanel] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [saving, setSaving] = useState(false);

  const ledger = useLedger(anchor.getUTCFullYear());
  const { categories } = useCategories();
  const { base, rates } = useCurrencies();
  const baseCurrency: Currency = base ?? 'UAH';

  // Resolve the panel's record from the loaded cache (no GET /:id endpoint).
  const editing = useLedgerRecord(ledger.records, panel.id);

  // Period (+ category) scope feeds the summary; the type toggle narrows only
  // the visible rows so both income and expenses still show in the cards.
  const periodScoped = useMemo(
    () =>
      ledger.records.filter(
        (r) =>
          isWithinPeriod(r.date, period, anchor) &&
          (categoryIds.length === 0 || categoryIds.includes(r.category.id)),
      ),
    [ledger.records, period, anchor, categoryIds],
  );

  const visible = useMemo(
    () => periodScoped.filter((r) => typeFilter === 'all' || r.type === typeFilter),
    [periodScoped, typeFilter],
  );

  const openCreate = () => setPanel({ open: true, id: null });
  const openEdit = (record: LedgerEntry) => setPanel({ open: true, id: record.id });
  const closePanel = () => setPanel((p) => ({ ...p, open: false }));

  const handleSave = async (dto: CreateLedgerEntryDto, id?: number) => {
    setSaving(true);
    try {
      if (id) await ledger.update(id, dto);
      else await ledger.create(dto);
      closePanel();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await ledger.remove(id);
    closePanel();
  };

  return (
    <>
      <PageHeader
        title={t('ledger.title')}
        subtitle={t('ledger.subtitle')}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PlusIcon size={16} />
            {t('ledger.add')}
          </button>
        }
      />

      <div className="space-y-5">
        <SummaryBar
          records={periodScoped}
          base={baseCurrency}
          rates={rates}
          loading={ledger.loading}
        />

        <LedgerFilter
          period={period}
          onPeriodChange={setPeriod}
          date={anchor}
          onDateChange={setDate}
          categories={categories}
          selectedCategoryIds={categoryIds}
          onSelectedCategoriesChange={setCategoryIds}
          typeFilter={typeFilter}
          onTypeFilterChange={setType}
        />

        <div className="rounded-lg border-hairline border-line bg-surface">
          <div className="flex items-center justify-end border-b-hairline border-line px-3 py-2">
            <div className="inline-flex overflow-hidden rounded-md border-hairline border-line">
              {(['list', 'table'] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(v)}
                    className={`${segBase} ${
                      active
                        ? 'bg-primary text-white'
                        : 'bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg'
                    }`}
                  >
                    {v === 'list' ? t('ledger.viewList') : t('ledger.viewTable')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2">
            {ledger.error ? (
              <EmptyState
                icon={<AlertIcon size={22} />}
                title={t('ledger.loadError')}
                description={ledger.error}
                action={
                  <button
                    type="button"
                    onClick={ledger.refresh}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t('error.retry')}
                  </button>
                }
              />
            ) : view === 'table' ? (
              <LedgerTable
                records={visible}
                loading={ledger.loading}
                sort={sort}
                onSortChange={setSort}
                onRowClick={openEdit}
              />
            ) : ledger.loading ? (
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} variant="list" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={22} />}
                title={t('ledger.emptyTitle')}
                description={t('ledger.emptyBody')}
              />
            ) : (
              <div className="divide-y divide-line">
                {visible.map((r) => (
                  <LedgerListItem key={r.id} record={r} onClick={openEdit} onEdit={openEdit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RecordSidePanel
        open={panel.open}
        record={editing}
        categories={categories}
        defaultDate={toISODate(anchor)}
        saving={saving}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={closePanel}
      />
    </>
  );
}
