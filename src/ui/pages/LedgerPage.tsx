import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { useLedger, useLedgerRecord } from '../hooks/useLedger.ts';
import { useCategories } from '../hooks/useCategories.ts';
import { useCurrencies } from '../hooks/useCurrencies.ts';
import { useLedgerFilters, type LedgerView } from '../hooks/useLedgerFilters.ts';
import { isWithinPeriod, toISODate } from '../lib/datePeriod.ts';
import { Button } from '../components/Button.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { SummaryBar } from '../components/SummaryBar.tsx';
import { LedgerFilter } from '../components/LedgerFilter.tsx';
import { LedgerListItem } from '../components/LedgerListItem.tsx';
import { LedgerTable } from '../components/LedgerTable.tsx';
import { LedgerCalendar } from '../components/LedgerCalendar.tsx';
import { CellEntriesModal } from '../components/CellEntriesModal.tsx';
import { RecordSidePanel } from '../components/RecordSidePanel.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon, InboxIcon, PlusIcon } from '../components/icons.tsx';
import type {
  Category,
  CreateLedgerEntryDto,
  Currency,
  LedgerEntry,
  LedgerEntryType,
} from '../types.ts';

const segBase =
  'px-3 py-1 text-xs font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

interface PanelState {
  open: boolean;
  id: number | null;
  createDefaults?: { categoryId?: number; date?: string; type?: LedgerEntryType };
}

interface CellState {
  open: boolean;
  category: Category | null;
  date: string | null;
  type: LedgerEntryType;
}

const VIEWS: {
  key: LedgerView;
  labelKey: 'ledger.viewList' | 'ledger.viewTable' | 'ledger.viewCalendar';
}[] = [
  { key: 'list', labelKey: 'ledger.viewList' },
  { key: 'table', labelKey: 'ledger.viewTable' },
  { key: 'calendar', labelKey: 'ledger.viewCalendar' },
];

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

  const [panel, setPanel] = useState<PanelState>({ open: false, id: null });
  const [cell, setCell] = useState<CellState>({
    open: false,
    category: null,
    date: null,
    type: 'expense',
  });
  const [saving, setSaving] = useState(false);

  const ledger = useLedger(anchor.getUTCFullYear());
  const { categories } = useCategories();
  const { base, rates } = useCurrencies();
  const baseCurrency: Currency = base ?? 'UAH';

  // Calendar is inherently a month grid; force month scope when it is active.
  const calendarMode = view === 'calendar';
  const scopePeriod = calendarMode ? 'month' : period;

  const editing = useLedgerRecord(ledger.records, panel.id);

  // Category-only scope (calendar pivots the whole month from this).
  const categoryScoped = useMemo(
    () =>
      ledger.records.filter((r) => categoryIds.length === 0 || categoryIds.includes(r.category.id)),
    [ledger.records, categoryIds],
  );

  // Period scope feeds the summary; the type toggle narrows only the visible
  // list/table rows so both income and expenses still show in the cards.
  const periodScoped = useMemo(
    () => categoryScoped.filter((r) => isWithinPeriod(r.date, scopePeriod, anchor)),
    [categoryScoped, scopePeriod, anchor],
  );

  const visible = useMemo(
    () => periodScoped.filter((r) => typeFilter === 'all' || r.type === typeFilter),
    [periodScoped, typeFilter],
  );

  const cellEntries = useMemo(() => {
    if (!cell.open || !cell.category || !cell.date) return [];
    const categoryId = cell.category.id;
    return categoryScoped.filter(
      (r) => r.category.id === categoryId && r.date === cell.date && r.type === cell.type,
    );
  }, [cell, categoryScoped]);

  const openCreate = () => setPanel({ open: true, id: null });
  const openEdit = (record: LedgerEntry) => setPanel({ open: true, id: record.id });
  const closePanel = () => setPanel((p) => ({ ...p, open: false }));

  const handleCellClick = (type: LedgerEntryType, category: Category, day: number) => {
    const date = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setCell({ open: true, category, date, type });
  };

  const handleCellEdit = (record: LedgerEntry) => {
    setCell((c) => ({ ...c, open: false }));
    openEdit(record);
  };

  const handleCellAdd = () => {
    if (!cell.category || !cell.date) return;
    setPanel({
      open: true,
      id: null,
      createDefaults: { categoryId: cell.category.id, date: cell.date, type: cell.type },
    });
    setCell((c) => ({ ...c, open: false }));
  };

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
          <Button onClick={openCreate}>
            <PlusIcon size={16} />
            {t('ledger.add')}
          </Button>
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
          period={scopePeriod}
          onPeriodChange={setPeriod}
          date={anchor}
          onDateChange={setDate}
          categories={categories}
          selectedCategoryIds={categoryIds}
          onSelectedCategoriesChange={setCategoryIds}
          typeFilter={typeFilter}
          onTypeFilterChange={setType}
          hideGranularity={calendarMode}
        />

        <div className="rounded-lg border-hairline border-line bg-surface">
          <div className="flex items-center justify-end border-b-hairline border-line px-3 py-2">
            <div className="inline-flex overflow-hidden rounded-md border-hairline border-line">
              {VIEWS.map((v) => {
                const active = view === v.key;
                return (
                  <button
                    key={v.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(v.key)}
                    className={`${segBase} ${
                      active
                        ? 'bg-primary text-white'
                        : 'bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg'
                    }`}
                  >
                    {t(v.labelKey)}
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
            ) : view === 'calendar' ? (
              <LedgerCalendar
                records={categoryScoped}
                year={anchor.getUTCFullYear()}
                month={anchor.getUTCMonth() + 1}
                base={baseCurrency}
                rates={rates}
                typeFilter={typeFilter}
                loading={ledger.loading}
                onCellClick={handleCellClick}
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

      <CellEntriesModal
        open={cell.open}
        category={cell.category}
        date={cell.date}
        entries={cellEntries}
        onEdit={handleCellEdit}
        onAdd={handleCellAdd}
        onClose={() => setCell((c) => ({ ...c, open: false }))}
      />

      <RecordSidePanel
        open={panel.open}
        record={editing}
        categories={categories}
        defaultDate={toISODate(anchor)}
        createDefaults={panel.createDefaults}
        saving={saving}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={closePanel}
      />
    </>
  );
}
