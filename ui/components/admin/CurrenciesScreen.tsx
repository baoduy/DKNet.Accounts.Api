'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { formatAmount } from '@/components/ledger/Money';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { routeRefusal } from '@/lib/api/refusal';
import { currenciesQueryOptions, currencyKey } from '@/lib/query/keys';
import { fetchCurrencies, fetchLedgerBalances } from '@/lib/query/currencies';
import type { Currency } from '@/lib/query/currencies';
import { useActivateCurrency, useDeactivateCurrency, useRegisterCurrency, useRenameCurrency } from '@/lib/query/mutations';

/**
 * DRK-1697 §3 row 12 — list (code, name, decimal places, status); registration form with the
 * live worked example; rename; deactivate/reactivate.
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

const LEDGER_BALANCES_QUERY_KEY = ['ledger', 'accounts', 'balances'] as const;

/** Whether a decimal-string amount is exactly zero — never routed through `Number` (R1). */
function isZeroAmount(amount: string): boolean {
  return /^[-+]?0(\.0+)?$/.test(amount);
}

export function CurrenciesScreen({ grantedScopes }: CurrenciesScreenProps): JSX.Element {
  const queryClient = useQueryClient();
  const canWrite = grantedScopes.includes('accounts.write');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [draft, setDraft] = useState<CurrencyDraft>(BLANK_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);

  const listQuery = useQuery({ ...currenciesQueryOptions(), queryFn: fetchCurrencies });
  const selected = listQuery.data?.find((currency) => currency.id === selectedId) ?? null;

  const balancesQuery = useQuery({
    queryKey: LEDGER_BALANCES_QUERY_KEY,
    queryFn: fetchLedgerBalances,
    enabled: panelMode === 'view' && selected != null,
  });
  const holdsBalance = selected != null && (balancesQuery.data ?? []).some((line) => line.currency === selected.code && !isZeroAmount(line.balance));

  const registerCurrency = useRegisterCurrency();
  const renameCurrency = useRenameCurrency();
  const activateCurrency = useActivateCurrency();
  const deactivateCurrency = useDeactivateCurrency();

  function resetFormState(): void {
    setFieldErrors({});
    setAlertErrors([]);
    setTraceId(undefined);
  }

  function openCreate(): void {
    setSelectedId(null);
    setDraft(BLANK_DRAFT);
    setPanelMode('create');
    resetFormState();
  }

  function openView(row: Currency): void {
    setSelectedId(row.id);
    setPanelMode('view');
    resetFormState();
  }

  function openEdit(currency: Currency): void {
    setDraft({ code: currency.code, name: currency.name, decimalPlaces: String(currency.decimalPlaces) });
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

  async function handleCreate(): Promise<void> {
    resetFormState();
    const result = await registerCurrency.mutate({ code: draft.code, name: draft.name, decimalPlaces: Number(draft.decimalPlaces) });
    if (!result.ok) {
      applyRefusal(result.errors, result.traceId);
      return;
    }
    if (result.currency) {
      queryClient.setQueryData(currencyKey(result.currency.id), result.currency);
      setSelectedId(result.currency.id);
    }
    setPanelMode('view');
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
  }

  async function handleActivate(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await activateCurrency.mutate({ currencyId: selectedId });
    if (!result.ok) applyRefusal(result.errors, result.traceId);
  }

  async function handleDeactivate(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await deactivateCurrency.mutate({ currencyId: selectedId });
    if (!result.ok) applyRefusal(result.errors, result.traceId);
  }

  const columns: LedgerColumn<Currency>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'decimalPlaces', header: 'Decimal places', align: 'right' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} /> },
  ];

  const workedExampleDecimalPlaces = /^\d+$/.test(draft.decimalPlaces) ? Number(draft.decimalPlaces) : 0;
  const workedExample = `${formatAmount('1250', workedExampleDecimalPlaces)} ${draft.code || 'units'}`;

  // Never `${code} · ${name}` here: the panel body's own Code/Name rows already show that
  // exact text, and Playwright's `getByText` substring-matches a title containing it too,
  // turning an unambiguous single match into a strict-mode violation (47-mai-corrects-...).
  const panelTitle = panelMode === 'create' ? 'New currency' : panelMode === 'edit' ? `Edit ${draft.code || 'currency'}` : 'Currency details';

  return (
    <div className="flex gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <ScopeGate scope="accounts.write" granted={canWrite}>
          <Button type="button" variant="primary" onClick={openCreate}>
            New currency
          </Button>
        </ScopeGate>

        <LedgerTable columns={columns} rows={listQuery.data ?? []} rowKey="id" selectedId={selectedId} onSelectRow={openView} emptyMessage="No currencies registered." />
      </div>

      {panelMode !== null ? (
        <div data-testid="detail-panel" className="w-96 flex-none">
          <DetailPanel
            title={panelTitle}
            onClose={closePanel}
            actions={
              panelMode === 'view' && selected ? (
                <>
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={() => openEdit(selected)}>
                      Edit currency
                    </Button>
                  </ScopeGate>
                  {selected.isActive ? (
                    <span className="inline-flex items-center gap-2">
                      <ScopeGate scope="accounts.write" granted={canWrite}>
                        <Button type="button" variant="destructive" size="sm" disabled={holdsBalance} onClick={handleDeactivate}>
                          Deactivate currency
                        </Button>
                      </ScopeGate>
                      {holdsBalance ? <span className="text-[length:var(--text-caption-size)] text-muted-foreground">CURRENCY_HOLDS_BALANCE</span> : null}
                    </span>
                  ) : (
                    <ScopeGate scope="accounts.write" granted={canWrite}>
                      <Button type="button" variant="primary" size="sm" onClick={handleActivate}>
                        Activate currency
                      </Button>
                    </ScopeGate>
                  )}
                </>
              ) : panelMode === 'edit' || panelMode === 'create' ? (
                <>
                  <Button type="button" size="sm" onClick={closePanel}>
                    Cancel
                  </Button>
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={panelMode === 'create' ? handleCreate : handleSave}>
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
                    { label: 'Code', value: selected.code },
                    { label: 'Name', value: selected.name },
                    { label: 'Decimal places', value: selected.decimalPlaces },
                    { label: 'Status', value: <StatusBadge status={selected.isActive ? 'Active' : 'Inactive'} /> },
                  ]}
                />
              </>
            ) : panelMode === 'edit' || panelMode === 'create' ? (
              <>
                <label className="flex flex-col gap-1">
                  Code
                  {panelMode === 'edit' ? (
                    <Input aria-label="Code" value={draft.code} disabled />
                  ) : (
                    <Input
                      aria-label="Code"
                      value={draft.code}
                      aria-invalid={fieldErrors.code ? 'true' : undefined}
                      onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    />
                  )}
                </label>
                {fieldErrors.code ? (
                  <p role="alert">
                    {fieldErrors.code.code} {fieldErrors.code.message}
                  </p>
                ) : null}

                <label className="flex flex-col gap-1">
                  Name
                  <Input
                    aria-label="Name"
                    value={draft.name}
                    aria-invalid={fieldErrors.name ? 'true' : undefined}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                {fieldErrors.name ? (
                  <p role="alert">
                    {fieldErrors.name.code} {fieldErrors.name.message}
                  </p>
                ) : null}

                <label className="flex flex-col gap-1">
                  Decimal places
                  {panelMode === 'edit' ? (
                    <Input aria-label="Decimal places" value={draft.decimalPlaces} disabled />
                  ) : (
                    <Input
                      aria-label="Decimal places"
                      value={draft.decimalPlaces}
                      aria-invalid={fieldErrors.decimalPlaces ? 'true' : undefined}
                      onChange={(event) => setDraft((current) => ({ ...current, decimalPlaces: event.target.value.replace(/[^0-9]/g, '') }))}
                    />
                  )}
                </label>

                {panelMode === 'create' ? <p data-testid="currency-worked-example">{workedExample}</p> : null}

                {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
              </>
            ) : null}
          </DetailPanel>
        </div>
      ) : null}
    </div>
  );
}
