'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { FORM_GRID, FormRow } from '@/components/admin/FormRow';
import { Acknowledgement } from '@/components/feedback/Acknowledgement';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { CURRENCIES_EMPTY } from '@/components/feedback/empty';
import { FailedRead, RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { formatAmount } from '@/components/ledger/Money';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TableCard } from '@/components/ui/table-card';
import { Caption, Mono, Note } from '@/components/ui/text';
import { isZeroAmount } from '@/lib/api/money-json';
import { routeRefusal } from '@/lib/api/refusal';
import { currenciesQueryOptions, ledgerBalancesKey } from '@/lib/query/keys';
import { fetchCurrencies, fetchLedgerBalances } from '@/lib/query/currencies';
import type { Currency } from '@/lib/query/currencies';
import { useActivateCurrency, useDeactivateCurrency, useRegisterCurrency, useRenameCurrency } from '@/lib/query/mutations';

/**
 * DRK-1697 §3 row 12 — list (code, name, decimal places, status); registration form with the
 * live worked example; rename; close (deactivate) and reopen (activate). Laid out as
 * Design/ui_kits/currencies-crud (DRK-1750).
 */
export interface CurrenciesScreenProps {
  grantedScopes: string[];
}

interface CurrencyDraft {
  code: string;
  name: string;
  decimalPlaces: string;
}

const BLANK_DRAFT: CurrencyDraft = { code: '', name: '', decimalPlaces: '' };
const DEFAULT_PAGE_SIZE = 10;

type DialogState = { kind: 'close' } | { kind: 'discard'; proceed: () => void } | null;

/** A currency's `decimalPlaces` is a single digit 0-6 (§6 R3: fixed for its whole lifetime, so it must be right on entry). */
function isValidDecimalPlaces(value: string): boolean {
  return /^[0-6]$/.test(value);
}

/** The service's `isActive`, in the design's wording: a deactivated currency reads Closed. */
function statusOf(currency: Currency): 'Active' | 'Closed' {
  return currency.isActive ? 'Active' : 'Closed';
}

export function CurrenciesScreen({ grantedScopes }: CurrenciesScreenProps): JSX.Element {
  const canWrite = grantedScopes.includes('accounts.write');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [draft, setDraft] = useState<CurrencyDraft>(BLANK_DRAFT);
  const [editOriginal, setEditOriginal] = useState<CurrencyDraft>(BLANK_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [flash, setFlash] = useState<{ title: string; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: 'code' | 'name' | 'decimalPlaces' | 'status'; desc: boolean } | undefined>(undefined);

  const listQuery = useQuery({ ...currenciesQueryOptions(), queryFn: fetchCurrencies });
  const selected = listQuery.data?.find((currency) => currency.id === selectedId) ?? null;

  const balancesQuery = useQuery({
    queryKey: ledgerBalancesKey(),
    queryFn: fetchLedgerBalances,
    enabled: panelMode === 'view' && selected != null,
  });
  const holdsBalance = selected != null && (balancesQuery.data ?? []).some((line) => line.currency === selected.code && !isZeroAmount(line.balance));
  const panelRef = usePanelFocus<HTMLDivElement>(panelMode !== null);

  const registerCurrency = useRegisterCurrency();
  const renameCurrency = useRenameCurrency();
  const activateCurrency = useActivateCurrency();
  const deactivateCurrency = useDeactivateCurrency();

  // `GET /currencies` takes no query and answers with the whole reference set, so search, status,
  // order and paging narrow that one read here — presentation, never a second read (R4).
  const all = listQuery.data ?? [];
  const needle = query.trim().toLowerCase();
  const matching = all.filter(
    (currency) => (statusFilter === '' || statusOf(currency) === statusFilter) && (needle === '' || `${currency.code} ${currency.name}`.toLowerCase().includes(needle)),
  );
  if (sort) {
    const key = (currency: Currency): string | number => (sort.field === 'status' ? statusOf(currency) : currency[sort.field]);
    matching.sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * (sort.desc ? -1 : 1);
    });
  }
  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = matching.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const dirty = (panelMode === 'create' || panelMode === 'edit') && JSON.stringify(draft) !== JSON.stringify(editOriginal);

  /** Runs `proceed` at once, or after "Discard unsaved changes?" when a form holds unsent edits. */
  function guardDirty(proceed: () => void): void {
    if (dirty) setDialog({ kind: 'discard', proceed });
    else proceed();
  }

  function resetFormState(): void {
    setFieldErrors({});
    setAlertErrors([]);
    setTraceId(undefined);
  }

  function openCreate(): void {
    setSelectedId(null);
    setDraft(BLANK_DRAFT);
    setEditOriginal(BLANK_DRAFT);
    setPanelMode('create');
    resetFormState();
  }

  function openView(row: Currency): void {
    setSelectedId(row.id);
    setPanelMode('view');
    resetFormState();
  }

  function openEdit(currency: Currency): void {
    const snapshot: CurrencyDraft = { code: currency.code, name: currency.name, decimalPlaces: String(currency.decimalPlaces) };
    setDraft(snapshot);
    setEditOriginal(snapshot);
    setPanelMode('edit');
    resetFormState();
  }

  function closePanel(): void {
    setSelectedId(null);
    setPanelMode(null);
    resetFormState();
  }

  function applyRefusal(errors: LedgerError[] | undefined, refusalTraceId: string | undefined): void {
    const routed = routeRefusal(errors ?? []);
    setFieldErrors(routed.fieldErrors);
    setAlertErrors(routed.alertErrors);
    setTraceId(refusalTraceId);
  }

  /**
   * View-mode actions (Close/Reopen) have no form field of their own to attach a field
   * error to, so every entry — field or not — goes to the alert; `RefusalAlert` itself drops
   * anything carrying a `field` (it expects a field-error renderer to show those instead), so
   * the field is stripped here rather than left for that filter to silently swallow it (R2-1,
   * DRK-1700 review round 2).
   */
  function applyViewRefusal(errors: LedgerError[] | undefined, refusalTraceId: string | undefined): void {
    setFieldErrors({});
    setAlertErrors((errors ?? []).map(({ field: _field, ...rest }) => rest));
    setTraceId(refusalTraceId);
  }

  async function handleCreate(): Promise<void> {
    if (!isValidDecimalPlaces(draft.decimalPlaces)) return;
    resetFormState();
    const result = await registerCurrency.mutate({ code: draft.code, name: draft.name, decimalPlaces: Number(draft.decimalPlaces) });
    if (!result.ok) {
      applyRefusal(result.errors, result.traceId);
      return;
    }
    if (result.currency) setSelectedId(result.currency.id);
    setPanelMode('view');
    const places = Number(draft.decimalPlaces);
    setFlash({ title: 'Currency registered', text: `Registered ${draft.code} at ${places} decimal place${places === 1 ? '' : 's'}. Accounts can now be opened in it.` });
  }

  async function handleSave(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await renameCurrency.mutate({ currencyId: selectedId, name: draft.name });
    if (!result.ok) {
      applyRefusal(result.errors, result.traceId);
      return;
    }
    setPanelMode('view');
    setFlash({ title: 'Changes saved', text: `Updated ${draft.code} — name. Stored balances are unaffected.` });
  }

  async function handleReopen(): Promise<void> {
    if (!selected) return;
    resetFormState();
    const result = await activateCurrency.mutate({ currencyId: selected.id });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    setFlash({ title: 'Currency reopened', text: `${selected.code} is active again. Accounts can be opened in it.` });
  }

  async function handleClose(): Promise<void> {
    setDialog(null);
    if (!selected) return;
    resetFormState();
    const result = await deactivateCurrency.mutate({ currencyId: selected.id });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    setFlash({ title: 'Currency closed', text: `${selected.code} is closed. Existing balances stay readable; no new account can be opened in it.` });
  }

  function minorUnit(decimalPlaces: number): string {
    return formatAmount('1250', decimalPlaces);
  }

  const columns: LedgerColumn<Currency>[] = [
    { key: 'code', header: 'Code', sortable: true, render: (row) => <Mono className="font-semibold">{row.code}</Mono> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'decimalPlaces', header: 'Decimals', sortable: true, align: 'right', render: (row) => <Mono>{row.decimalPlaces}</Mono> },
    {
      key: 'minorUnit',
      header: 'Minor unit',
      align: 'right',
      render: (row) => (
        <Caption>
          <Mono>{minorUnit(row.decimalPlaces)}</Mono>
        </Caption>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={statusOf(row)} /> },
  ];

  // No fallback to 0 decimal places (I1, DRK-1700 review): a blank or invalid entry has no
  // worked example to show, rather than one implying 0 is what will be registered.
  const workedExample = isValidDecimalPlaces(draft.decimalPlaces) ? `1,250 ${draft.code || 'units'} is stored and shown as ${minorUnit(Number(draft.decimalPlaces))}.` : null;
  const editing = panelMode === 'edit' || panelMode === 'create';

  const panelTitle =
    panelMode === 'create' ? (
      'New currency'
    ) : panelMode === 'edit' ? (
      `Edit ${draft.code || 'currency'}`
    ) : selected ? (
      <span className="flex min-w-0 flex-col gap-1.5">
        <span>{`${selected.code} · ${selected.name}`}</span>
        <span className="inline-flex items-center gap-2">
          <Chip>{selected.decimalPlaces} dp</Chip>
          <StatusBadge status={statusOf(selected)} />
        </span>
      </span>
    ) : (
      'Currency details'
    );

  const footnote =
    panelMode === 'edit'
      ? 'Code and decimal places are fixed after registration. Only the name can be corrected.'
      : panelMode === 'create'
        ? 'The code and decimal places cannot be changed after registration.'
        : null;

  const panel =
    panelMode !== null ? (
      <div ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="absolute inset-y-0 right-0 z-50 w-(--drawer-width) max-w-[92%] outline-none">
        <DetailPanel
          title={panelTitle}
          onClose={() => guardDirty(closePanel)}
          footnote={footnote}
          style={{ width: '100%', maxWidth: '100%' }}
          actions={
            panelMode === 'view' && selected ? (
              <>
                {selected.isActive ? (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="destructive" size="sm" disabled={holdsBalance || !balancesQuery.isSuccess} onClick={() => setDialog({ kind: 'close' })}>
                      Close currency
                    </Button>
                  </ScopeGate>
                ) : (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={handleReopen}>
                      Reopen currency
                    </Button>
                  </ScopeGate>
                )}
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button type="button" variant="primary" size="sm" onClick={() => openEdit(selected)}>
                    Edit currency
                  </Button>
                </ScopeGate>
              </>
            ) : editing ? (
              <>
                <Button type="button" size="sm" onClick={() => guardDirty(closePanel)}>
                  Cancel
                </Button>
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={panelMode === 'create' && !isValidDecimalPlaces(draft.decimalPlaces)}
                    onClick={panelMode === 'create' ? handleCreate : handleSave}
                  >
                    {panelMode === 'create' ? 'Register currency' : 'Save changes'}
                  </Button>
                </ScopeGate>
              </>
            ) : null
          }
        >
          {panelMode === 'view' && selected ? (
            <>
              <DetailSection divider={false} style={{ marginTop: 0 }}>
                Details
              </DetailSection>
              <DetailList
                items={[
                  { label: 'Code', value: <Mono>{selected.code}</Mono> },
                  { label: 'Name', value: selected.name },
                  { label: 'Decimal places', value: <Mono>{selected.decimalPlaces}</Mono> },
                  {
                    label: 'Minor unit',
                    value: (
                      <span>
                        <Mono>{minorUnit(selected.decimalPlaces)}</Mono> <Caption>= 1,250 {selected.code}</Caption>
                      </span>
                    ),
                  },
                ]}
              />
              <DetailSection>Usage</DetailSection>
              {balancesQuery.isError ? (
                <FailedRead error={balancesQuery.error} onRetry={() => void balancesQuery.refetch()} />
              ) : (
                <DetailList
                  items={[
                    {
                      label: 'Balances',
                      value: !balancesQuery.isSuccess ? (
                        <Caption>Reading balances…</Caption>
                      ) : holdsBalance ? (
                        <Caption>Accounts in this currency hold a balance, so it cannot be closed.</Caption>
                      ) : (
                        <Caption>No account in this currency holds a balance.</Caption>
                      ),
                    },
                  ]}
                />
              )}
              {holdsBalance && selected.isActive ? (
                <Note className="mt-3">
                  <Mono>CURRENCY_HOLDS_BALANCE</Mono> — close is unavailable until every balance in {selected.code} is zero.
                </Note>
              ) : null}
              {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
            </>
          ) : editing ? (
            <>
              <div className={FORM_GRID}>
                <FormRow
                  label="Code"
                  required
                  error={fieldErrors.code}
                  hint={panelMode === 'create' ? 'Upper-case letters only. ISO 4217 for fiat, the ticker for digital assets. Cannot be changed later.' : undefined}
                >
                  {panelMode === 'edit' ? (
                    <ReadOnlyField locked>
                      <Mono>{draft.code}</Mono>
                    </ReadOnlyField>
                  ) : (
                    <Input
                      mono
                      aria-label="Code"
                      placeholder="SGD"
                      value={draft.code}
                      invalid={Boolean(fieldErrors.code)}
                      onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    />
                  )}
                </FormRow>
                <FormRow label="Name" required error={fieldErrors.name} hint={panelMode === 'edit' ? 'Display name only.' : undefined}>
                  <Input
                    aria-label="Name"
                    placeholder="Singapore Dollar"
                    value={draft.name}
                    invalid={Boolean(fieldErrors.name)}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </FormRow>
                <FormRow label="Decimals" required error={fieldErrors.decimalPlaces} hint={panelMode === 'create' ? workedExample ? <span data-testid="currency-worked-example">{workedExample}</span> : '0 to 6.' : undefined}>
                  {panelMode === 'edit' ? (
                    <ReadOnlyField locked className="w-24">
                      <Mono>{draft.decimalPlaces}</Mono>
                    </ReadOnlyField>
                  ) : (
                    <Input
                      mono
                      aria-label="Decimal places"
                      placeholder="2"
                      value={draft.decimalPlaces}
                      invalid={Boolean(fieldErrors.decimalPlaces)}
                      className="w-24"
                      onChange={(event) => setDraft((current) => ({ ...current, decimalPlaces: event.target.value.replace(/[^0-9]/g, '') }))}
                    />
                  )}
                </FormRow>
              </div>
              {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
            </>
          ) : null}
        </DetailPanel>
      </div>
    ) : null;

  return (
    <>
      <PageHeader
        icon="coins"
        title="Currencies"
        description="Every account is denominated in one of these. The decimal places fix how amounts are stored and shown."
        actions={
          <ScopeGate scope="accounts.write" granted={canWrite}>
            <Button type="button" variant="primary" onClick={() => guardDirty(openCreate)}>
              <Plus size={14} aria-hidden="true" />
              New currency
            </Button>
          </ScopeGate>
        }
      />

      {flash ? (
        <Acknowledgement title={flash.title} onDismiss={() => setFlash(null)}>
          {flash.text}
        </Acknowledgement>
      ) : null}

      <TableCard
        // The panel overlays the card's right edge; a short list still leaves it room for the form.
        className={panelMode !== null ? 'min-h-[36rem]' : undefined}
        searchPlaceholder="Search code or name"
        searchValue={query}
        onSearchChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        rows={listQuery.data ? matching.length : undefined}
        total={listQuery.data ? all.length : undefined}
        filter={
          <FilterMenu activeCount={statusFilter ? 1 : 0} onClear={() => setStatusFilter('')}>
            <FilterField label="Status">
              <Select
                options={[{ value: '', label: 'Any' }, 'Active', 'Closed']}
                value={statusFilter}
                className="w-full"
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              />
            </FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount,
          pageSize,
          pageSizeOptions: [5, 10, 25, 50],
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        panel={panel}
      >
        {listQuery.isError ? (
          <FailedRead error={listQuery.error} onRetry={() => void listQuery.refetch()} />
        ) : (
          <LedgerTable
            columns={columns}
            rows={visible}
            rowKey="id"
            selectedId={selectedId}
            onSelectRow={(row) => guardDirty(() => openView(row))}
            orderBy={sort?.field}
            desc={sort?.desc}
            onSort={(field) => setSort((current) => ({ field: field as NonNullable<typeof sort>['field'], desc: current?.field === field && !current.desc }))}
            loading={listQuery.isPending}
            placeholderRows={pageSize}
            emptyMessage={all.length === 0 ? CURRENCIES_EMPTY : 'No currencies match this filter.'}
          />
        )}
      </TableCard>

      <Dialog
        open={dialog?.kind === 'close' && selected !== null}
        tone="destructive"
        title="Close currency"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button type="button" onClick={() => setDialog(null)}>
              Keep currency open
            </Button>
            <Button type="button" variant="destructive" onClick={handleClose}>
              Close currency
            </Button>
          </>
        }
      >
        {selected ? (
          <>
            <div>
              Closing <Mono>{selected.code}</Mono> stops any new account being opened in it. The accounts already denominated in it stay readable and keep their balances.
            </div>
            <Note className="mt-3">Reversible — a closed currency can be reopened from this panel.</Note>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'discard'}
        title="Discard unsaved changes?"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button type="button" onClick={() => setDialog(null)}>
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (dialog?.kind === 'discard') dialog.proceed();
                setDialog(null);
              }}
            >
              Discard changes
            </Button>
          </>
        }
      >
        This form has edits that have not been sent. Closing the panel drops them.
      </Dialog>
    </>
  );
}
