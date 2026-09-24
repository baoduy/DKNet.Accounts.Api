'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { MetadataEditor, type MetadataEntry } from '@/components/forms/MetadataEditor';
import { CurrencyBalanceList } from '@/components/ledger/CurrencyBalanceList';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isZeroAmount } from '@/lib/api/money-json';
import { ledgerErrorTraceId, routeRefusal, toLedgerError } from '@/lib/api/refusal';
import { accountGroupBalancesKey, accountGroupKey, accountGroupsListKey } from '@/lib/query/keys';
import { fetchAccountGroup, fetchAccountGroupBalances, fetchAccountGroups, ACCOUNT_GROUPS_PAGE_SIZE } from '@/lib/query/groups';
import type { AccountGroup, AccountGroupType } from '@/lib/query/groups';
import { useActivateAccountGroup, useCloseAccountGroup, useCreateAccountGroup, useDeleteAccountGroup, useUpdateAccountGroup } from '@/lib/query/mutations';
import { parseListViewState, toListViewSearchParams } from '@/lib/url-state';
import type { ListViewState } from '@/lib/url-state';

/**
 * DRK-1697 §3 row 11 — list narrowed by owner id and status, sorted, paged, URL-backed;
 * create/edit form; balances via `CurrencyBalanceList`; `ScopeGate`d close/delete/reopen.
 */
export interface AccountGroupsScreenProps {
  grantedScopes: string[];
}

export function AccountGroupsScreen(props: AccountGroupsScreenProps): JSX.Element {
  return <AccountGroupsScreenContent {...props} />;
}

const GROUP_TYPES: AccountGroupType[] = ['Customer', 'Merchant', 'Internal', 'Suspense', 'Settlement'];

interface GroupDraft {
  code: string;
  name: string;
  description: string;
  type: AccountGroupType;
  ownerId: string;
  metadata: MetadataEntry[];
}

const BLANK_DRAFT: GroupDraft = { code: '', name: '', description: '', type: 'Customer', ownerId: '', metadata: [] };

interface GroupEditSnapshot {
  name: string;
  description: string;
  metadata: MetadataEntry[];
}

/** A decimal-string's exact number of fractional digits — never routed through `Number` (R1). */
function fractionDigits(amount: string): number {
  const dotIndex = amount.indexOf('.');
  return dotIndex === -1 ? 0 : amount.length - dotIndex - 1;
}

function recordToMetadataEntries(record: Record<string, string> | undefined): MetadataEntry[] {
  return Object.entries(record ?? {}).map(([key, value]) => ({ key, value }));
}

function metadataToRecord(entries: MetadataEntry[]): Record<string, string> | undefined {
  const nonEmpty = entries.filter((entry) => entry.key.trim() !== '');
  return nonEmpty.length === 0 ? undefined : Object.fromEntries(nonEmpty.map((entry) => [entry.key, entry.value]));
}

function AccountGroupsScreenContent({ grantedScopes }: AccountGroupsScreenProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The list's filters/sort/page live in local state, seeded once from the address a fresh
  // mount (a reload of a shared link) was opened with — not re-derived from `useSearchParams()`
  // on every render. This route is `force-dynamic`, so `router.replace` round-trips to the dev
  // server for a fresh RSC render on every call; two calls fired close together (a sort click
  // immediately followed by a pagination click) can have their responses land out of order,
  // silently reverting the list to an earlier filter/sort/page (DRK-1697 review: exactly this
  // sequence lost `page`/`pageSize` this way). Syncing the address bar with a raw
  // `history.replaceState` — never asking Next's router to navigate — keeps every interaction
  // instant and correct regardless of that race; only the cosmetic URL is best-effort.
  const [state, setState] = useState<ListViewState>(() => parseListViewState(searchParams));
  const queryClient = useQueryClient();
  const canWrite = grantedScopes.includes('accounts.write');

  function updateState(patch: Partial<ListViewState>): void {
    setState((current) => {
      const next: ListViewState = { ...current, ...patch };
      window.history.replaceState(null, '', `${pathname}?${toListViewSearchParams(next).toString()}`);
      return next;
    });
  }

  function setFilter(field: string, value: string): void {
    const filters = { ...state.filters };
    if (value) filters[field] = value;
    else delete filters[field];
    updateState({ filters, page: undefined, pageSize: undefined });
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(BLANK_DRAFT);
  const [editOriginal, setEditOriginal] = useState<GroupEditSnapshot>({ name: '', description: '', metadata: [] });
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);

  const listQuery = useQuery({
    queryKey: accountGroupsListKey({ ...state.filters, sort: state.sort, page: state.page, pageSize: state.pageSize }),
    queryFn: () => fetchAccountGroups(state),
  });

  const viewQuery = useQuery({
    queryKey: accountGroupKey(selectedId ?? ''),
    queryFn: () => fetchAccountGroup(selectedId as string),
    enabled: selectedId != null,
  });
  const viewingGroup = viewQuery.data ?? null;

  const balancesQuery = useQuery({
    queryKey: accountGroupBalancesKey(selectedId ?? ''),
    queryFn: () => fetchAccountGroupBalances(selectedId as string),
    enabled: panelMode === 'view' && selectedId != null,
  });
  const balances = balancesQuery.data ?? [];
  const holdsBalance = balances.some((line) => !isZeroAmount(line.balance));
  const holdsAccount = balances.length > 0;

  const createGroup = useCreateAccountGroup();
  const updateGroup = useUpdateAccountGroup();
  const closeGroup = useCloseAccountGroup();
  const activateGroup = useActivateAccountGroup();
  const deleteGroup = useDeleteAccountGroup();

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

  function openView(row: AccountGroup): void {
    setSelectedId(row.id);
    setPanelMode('view');
    resetFormState();
  }

  function openEdit(group: AccountGroup): void {
    const snapshot: GroupEditSnapshot = { name: group.name, description: group.description ?? '', metadata: recordToMetadataEntries(group.metadata) };
    setDraft({ code: group.code, name: snapshot.name, description: snapshot.description, type: group.type, ownerId: group.ownerId, metadata: snapshot.metadata.map((entry) => ({ ...entry })) });
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
   * View-mode actions (Close/Reopen/Delete) have no form field of their own to attach a field
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
    resetFormState();
    const result = await createGroup.mutate({
      code: draft.code,
      name: draft.name,
      description: draft.description.trim() || undefined,
      type: draft.type,
      ownerId: draft.ownerId,
      metadata: metadataToRecord(draft.metadata),
    });
    if (!result.ok) {
      applyRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) {
      queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
      setSelectedId(result.group.id);
    }
    setPanelMode('view');
  }

  async function handleSave(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const metadataChanged = JSON.stringify(draft.metadata) !== JSON.stringify(editOriginal.metadata);
    const result = await updateGroup.mutate({
      groupId: selectedId,
      name: draft.name !== editOriginal.name ? draft.name : undefined,
      description: draft.description !== editOriginal.description ? draft.description.trim() || undefined : undefined,
      metadata: metadataChanged ? (metadataToRecord(draft.metadata) ?? {}) : undefined,
    });
    if (!result.ok) {
      applyRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
    setPanelMode('view');
  }

  async function handleClose(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await closeGroup.mutate({ groupId: selectedId });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
  }

  async function handleReopen(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await activateGroup.mutate({ groupId: selectedId });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
  }

  async function handleDelete(): Promise<void> {
    if (!selectedId) return;
    resetFormState();
    const result = await deleteGroup.mutate({ groupId: selectedId });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    closePanel();
  }

  const columns: LedgerColumn<AccountGroup>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type' },
    { key: 'ownerId', header: 'Owner', queryAs: 'ownerId' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const currentPage = state.page ?? 1;
  const hasNextPage =
    state.pageSize !== undefined ? Boolean(listQuery.data?.hasNextPage) : (listQuery.data?.items.length ?? 0) > ACCOUNT_GROUPS_PAGE_SIZE;

  // Never `${code} · ${name}` here: the panel body's own Code/Owner rows already show that
  // exact text, and the title would otherwise repeat it — a screen reader announcing the
  // panel would say the same code twice, and any text match against the title would collide
  // with the identical text in the body below it.
  const panelTitle = panelMode === 'create' ? 'New account group' : panelMode === 'edit' ? `Edit ${draft.code || 'group'}` : 'Account group details';

  return (
    <div className="flex gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <ScopeGate scope="accounts.write" granted={canWrite}>
          <Button type="button" variant="primary" onClick={openCreate}>
            New group
          </Button>
        </ScopeGate>

        {panelMode === null ? (
          <div className="flex items-end gap-4">
            <label className="flex flex-col gap-1">
              Status filter
              <select aria-label="Status filter" value={state.filters.status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
                <option value="">Any</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Owner filter
              <Input aria-label="Owner filter" value={state.filters.ownerId ?? ''} onChange={(event) => setFilter('ownerId', event.target.value)} />
            </label>
          </div>
        ) : null}

        {listQuery.isError ? (
          <RefusalAlert errors={[toLedgerError(listQuery.error)]} traceId={ledgerErrorTraceId(listQuery.error)} />
        ) : (
          <LedgerTable
            columns={columns}
            rows={listQuery.data?.items ?? []}
            rowKey="id"
            selectedId={selectedId}
            onSelectRow={openView}
            orderBy={state.sort?.field}
            desc={state.sort?.desc}
            onSort={(field) => updateState({ sort: { field, desc: state.sort?.field === field && !state.sort.desc } })}
            emptyMessage="No groups match this filter."
          />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => updateState({ page: Math.max(1, currentPage - 1), pageSize: state.pageSize ?? ACCOUNT_GROUPS_PAGE_SIZE })} disabled={currentPage <= 1}>
            Previous page
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => updateState({ page: currentPage + 1, pageSize: state.pageSize ?? ACCOUNT_GROUPS_PAGE_SIZE })}
            disabled={!hasNextPage}
          >
            Next page
          </Button>
        </div>
      </div>

      {panelMode !== null ? (
        <div data-testid="detail-panel" className="w-96 flex-none">
          <DetailPanel
            title={panelTitle}
            onClose={closePanel}
            actions={
              panelMode === 'view' && viewingGroup ? (
                <>
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={() => openEdit(viewingGroup)}>
                      Edit group
                    </Button>
                  </ScopeGate>
                  {viewingGroup.status === 'Closed' ? (
                    <ScopeGate scope="accounts.write" granted={canWrite}>
                      <Button type="button" variant="primary" size="sm" onClick={handleReopen}>
                        Reopen group
                      </Button>
                    </ScopeGate>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ScopeGate scope="accounts.write" granted={canWrite}>
                        <Button type="button" variant="destructive" size="sm" disabled={holdsBalance || !balancesQuery.isSuccess} onClick={handleClose}>
                          Close group
                        </Button>
                      </ScopeGate>
                      {holdsBalance ? (
                        <span className="text-[length:var(--text-caption-size)] text-muted-foreground">
                          This group holds an account with a balance. <span className="font-mono">GROUP_HOLDS_BALANCE</span>
                        </span>
                      ) : null}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2">
                    <ScopeGate scope="accounts.write" granted={canWrite}>
                      <Button type="button" variant="destructive" size="sm" disabled={holdsAccount || !balancesQuery.isSuccess} onClick={handleDelete}>
                        Delete group
                      </Button>
                    </ScopeGate>
                    {holdsAccount ? (
                      <span className="text-[length:var(--text-caption-size)] text-muted-foreground">
                        This group still holds an account. <span className="font-mono">GROUP_NOT_EMPTY</span>
                      </span>
                    ) : null}
                  </span>
                </>
              ) : panelMode === 'edit' || panelMode === 'create' ? (
                <>
                  <Button type="button" size="sm" onClick={closePanel}>
                    Cancel
                  </Button>
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={panelMode === 'create' ? handleCreate : handleSave}>
                      {panelMode === 'create' ? 'Create group' : 'Save changes'}
                    </Button>
                  </ScopeGate>
                </>
              ) : null
            }
          >
            {panelMode === 'view' && viewingGroup ? (
              <>
                <DetailSection divider={false} style={{ marginTop: 0 }}>
                  Details
                </DetailSection>
                <DetailList
                  items={[
                    { label: 'Code', value: viewingGroup.code },
                    { label: 'Name', value: viewingGroup.name },
                    { label: 'Description', value: viewingGroup.description || 'Not set.' },
                    { label: 'Owner', value: viewingGroup.ownerId },
                    { label: 'Type', value: viewingGroup.type },
                    { label: 'Status', value: <StatusBadge status={viewingGroup.status} /> },
                  ]}
                />
                {Object.keys(viewingGroup.metadata ?? {}).length > 0 ? (
                  <>
                    <DetailSection>Metadata</DetailSection>
                    <MetadataEditor readOnly entries={recordToMetadataEntries(viewingGroup.metadata)} />
                  </>
                ) : null}
                <DetailSection>Balances</DetailSection>
                {balancesQuery.isError ? (
                  <RefusalAlert errors={[toLedgerError(balancesQuery.error)]} traceId={ledgerErrorTraceId(balancesQuery.error)} />
                ) : (
                  <CurrencyBalanceList
                    balances={balances.map((line) => ({ currency: line.currency, amount: line.balance, decimalPlaces: fractionDigits(line.balance) }))}
                    emptyMessage="This group holds no account."
                  />
                )}
                {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
              </>
            ) : panelMode === 'view' && viewQuery.isError ? (
              <RefusalAlert errors={[toLedgerError(viewQuery.error)]} traceId={ledgerErrorTraceId(viewQuery.error)} />
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
                  Owner
                  {panelMode === 'edit' ? (
                    <Input aria-label="Owner" value={draft.ownerId} disabled />
                  ) : (
                    <Input
                      aria-label="Owner"
                      value={draft.ownerId}
                      aria-invalid={fieldErrors.ownerId ? 'true' : undefined}
                      onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}
                    />
                  )}
                </label>
                {fieldErrors.ownerId ? (
                  <p role="alert">
                    {fieldErrors.ownerId.code} {fieldErrors.ownerId.message}
                  </p>
                ) : null}

                {panelMode === 'create' ? (
                  <label className="flex flex-col gap-1">
                    Type
                    <select aria-label="Type" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as AccountGroupType }))}>
                      {GROUP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="flex flex-col gap-1">
                  Description
                  <Input aria-label="Description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                </label>

                <MetadataEditor entries={draft.metadata} onChange={(entries) => setDraft((current) => ({ ...current, metadata: entries }))} />

                {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
              </>
            ) : null}
          </DetailPanel>
        </div>
      ) : null}
    </div>
  );
}
