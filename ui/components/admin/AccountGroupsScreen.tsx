'use client';

import { useLayoutEffect, useState } from 'react';
import type { JSX } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { FORM_GRID, FormRow } from '@/components/admin/FormRow';
import { Acknowledgement } from '@/components/feedback/Acknowledgement';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { emptyMessage, GROUPS_EMPTY } from '@/components/feedback/empty';
import { FailedRead, RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { MetadataEditor, type MetadataEntry } from '@/components/forms/MetadataEditor';
import { CurrencyBalanceList } from '@/components/ledger/CurrencyBalanceList';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCard } from '@/components/ui/table-card';
import { Caption, Mono, Note } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { isZeroAmount } from '@/lib/api/money-json';
import { routeRefusal } from '@/lib/api/refusal';
import { accountGroupBalancesKey, accountGroupKey, accountGroupsListKey } from '@/lib/query/keys';
import { fetchAccountGroup, fetchAccountGroupBalances, fetchAccountGroups, ACCOUNT_GROUPS_PAGE_SIZE } from '@/lib/query/groups';
import type { AccountGroup, AccountGroupType } from '@/lib/query/groups';
import { useActivateAccountGroup, useCloseAccountGroup, useCreateAccountGroup, useDeleteAccountGroup, useUpdateAccountGroup } from '@/lib/query/mutations';
import { pushRecent } from '@/lib/recent/store';
import { parseListViewState, toListViewSearchParams } from '@/lib/url-state';
import type { ListViewState } from '@/lib/url-state';

/**
 * DRK-1697 §3 row 11 — list narrowed by search, type, status and owner id, sorted, paged,
 * URL-backed; create/edit form; balances via `CurrencyBalanceList`; `ScopeGate`d
 * close/delete/reopen. Laid out as Design/ui_kits/account-groups-crud (DRK-1750).
 */
export interface AccountGroupsScreenProps {
  grantedScopes: string[];
  /** Keys the operator's recently viewed list (DRK-1728 §3 row 8); unset, nothing is kept. */
  directoryObjectId?: string;
}

export function AccountGroupsScreen(props: AccountGroupsScreenProps): JSX.Element {
  return <AccountGroupsScreenContent {...props} />;
}

const GROUP_TYPES: AccountGroupType[] = ['Customer', 'Merchant', 'Internal', 'Suspense', 'Settlement'];
const ANY = { value: '', label: 'Any' };
/** The filter menu's fields; search sits in the card bar and is cleared on its own. */
const MENU_FILTERS = ['type', 'status', 'ownerId'];

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

type DialogState = { kind: 'close' } | { kind: 'discard'; proceed: () => void } | null;

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

function AccountGroupsScreenContent({ grantedScopes, directoryObjectId }: AccountGroupsScreenProps): JSX.Element {
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
    updateState({ filters, page: undefined });
  }

  function clearMenuFilters(): void {
    const filters = { ...state.filters };
    for (const field of MENU_FILTERS) delete filters[field];
    updateState({ filters, page: undefined });
  }

  // `?open=<id>` (the search, a recently viewed entry) opens that group's panel on arrival.
  const [selectedId, setSelectedId] = useState<string | null>(state.openRecordId ?? null);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create' | null>(state.openRecordId ? 'view' : null);
  const [draft, setDraft] = useState<GroupDraft>(BLANK_DRAFT);
  const [editOriginal, setEditOriginal] = useState<GroupEditSnapshot>({ name: '', description: '', metadata: [] });
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [flash, setFlash] = useState<{ title: string; text: string } | null>(null);

  // The pager always has a page size, so the service is always asked for exactly one page (R2).
  const pageSize = state.pageSize ?? ACCOUNT_GROUPS_PAGE_SIZE;
  const listQuery = useQuery({
    queryKey: accountGroupsListKey({ ...state.filters, sort: state.sort, page: state.page, pageSize }),
    queryFn: () => fetchAccountGroups({ ...state, pageSize }),
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
  const panelRef = usePanelFocus<HTMLDivElement>(panelMode !== null);

  // Kept as the group's panel is drawn — before paint, so an operator who moves straight on still has it.
  useLayoutEffect(() => {
    if (directoryObjectId && selectedId) pushRecent(directoryObjectId, 'AccountGroup', selectedId);
  }, [directoryObjectId, selectedId]);

  const createGroup = useCreateAccountGroup();
  const updateGroup = useUpdateAccountGroup();
  const closeGroup = useCloseAccountGroup();
  const activateGroup = useActivateAccountGroup();
  const deleteGroup = useDeleteAccountGroup();

  const dirty =
    panelMode === 'create'
      ? JSON.stringify(draft) !== JSON.stringify(BLANK_DRAFT)
      : panelMode === 'edit' && JSON.stringify({ name: draft.name, description: draft.description, metadata: draft.metadata }) !== JSON.stringify(editOriginal);

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
    if (state.openRecordId) updateState({ openRecordId: undefined });
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
    setFlash({ title: 'Group created', text: `Created ${draft.code} — ${draft.name}. No accounts are open in it yet.` });
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
    setFlash({ title: 'Changes saved', text: `Updated ${draft.code}. Code and currency of existing accounts are unaffected.` });
  }

  async function handleClose(): Promise<void> {
    setDialog(null);
    if (!selectedId || !viewingGroup) return;
    resetFormState();
    const result = await closeGroup.mutate({ groupId: selectedId });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
    setFlash({ title: 'Group closed', text: `${viewingGroup.code} is closed. Existing accounts stay readable; no new account can be opened in it.` });
  }

  async function handleReopen(): Promise<void> {
    if (!selectedId || !viewingGroup) return;
    resetFormState();
    const result = await activateGroup.mutate({ groupId: selectedId });
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
    setFlash({ title: 'Group reopened', text: `${viewingGroup.code} is active again. New accounts can be opened in it.` });
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
    { key: 'code', header: 'Code', sortable: true, render: (row) => <Mono className="font-semibold">{row.code}</Mono> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type', sortable: true, render: (row) => <Chip>{row.type}</Chip> },
    { key: 'ownerId', header: 'Owner', sortable: true, queryAs: 'ownerId', render: (row) => <Mono>{row.ownerId}</Mono> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  const currentPage = state.page ?? 1;
  const menuFilterCount = MENU_FILTERS.filter((field) => state.filters[field]).length;
  const editing = panelMode === 'edit' || panelMode === 'create';

  const panelTitle =
    panelMode === 'create' ? (
      'New account group'
    ) : panelMode === 'edit' ? (
      `Edit ${draft.code || 'group'}`
    ) : viewingGroup ? (
      <span className="flex min-w-0 flex-col gap-1.5">
        <span>{`${viewingGroup.code} · ${viewingGroup.name}`}</span>
        <span className="inline-flex items-center gap-2">
          <Chip>{viewingGroup.type}</Chip>
          <StatusBadge status={viewingGroup.status} />
        </span>
      </span>
    ) : (
      'Account group details'
    );

  // The reasons a view-mode action is disabled, with the service's own refusal codes (R3).
  const viewFootnote =
    panelMode === 'view' && viewingGroup && (holdsAccount || holdsBalance) ? (
      <>
        {holdsBalance && viewingGroup.status !== 'Closed' ? (
          <div>
            This group holds an account with a balance. <Mono>GROUP_HOLDS_BALANCE</Mono>
          </div>
        ) : null}
        {holdsAccount ? (
          <div>
            This group still holds an account. <Mono>GROUP_NOT_EMPTY</Mono>
          </div>
        ) : null}
      </>
    ) : null;

  const footnote =
    panelMode === 'edit'
      ? 'Code, type and owner are immutable after creation. Renaming does not touch account numbers.'
      : panelMode === 'create'
        ? 'Code, type and owner are fixed once the group is created. The code becomes the prefix of every account number in it.'
        : viewFootnote;

  const panel =
    panelMode !== null ? (
      <div ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="absolute inset-y-0 right-0 z-50 w-(--drawer-width) max-w-[92%] outline-none">
        <DetailPanel
          title={panelTitle}
          onClose={() => guardDirty(closePanel)}
          footnote={footnote}
          style={{ width: '100%', maxWidth: '100%' }}
          actions={
            panelMode === 'view' && viewingGroup ? (
              <>
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button type="button" variant="destructive" size="sm" disabled={holdsAccount || !balancesQuery.isSuccess} onClick={handleDelete}>
                    Delete group
                  </Button>
                </ScopeGate>
                {viewingGroup.status === 'Closed' ? (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" onClick={handleReopen}>
                      Reopen group
                    </Button>
                  </ScopeGate>
                ) : (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="destructive" size="sm" disabled={holdsBalance || !balancesQuery.isSuccess} onClick={() => setDialog({ kind: 'close' })}>
                      Close group
                    </Button>
                  </ScopeGate>
                )}
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button type="button" variant="primary" size="sm" onClick={() => openEdit(viewingGroup)}>
                    Edit group
                  </Button>
                </ScopeGate>
              </>
            ) : editing ? (
              <>
                <Button type="button" size="sm" onClick={() => guardDirty(closePanel)}>
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
                  { label: 'Code', value: <Mono>{viewingGroup.code}</Mono> },
                  { label: 'Name', value: viewingGroup.name },
                  { label: 'Description', value: viewingGroup.description ? viewingGroup.description : <Caption>Not set.</Caption> },
                  { label: 'Owner', value: <Mono>{viewingGroup.ownerId}</Mono> },
                ]}
              />
              {Object.keys(viewingGroup.metadata ?? {}).length > 0 ? (
                <>
                  <DetailSection>Metadata</DetailSection>
                  <MetadataEditor readOnly entries={recordToMetadataEntries(viewingGroup.metadata)} />
                </>
              ) : null}
              <DetailSection>Content</DetailSection>
              {balancesQuery.isError ? (
                <FailedRead error={balancesQuery.error} onRetry={() => void balancesQuery.refetch()} />
              ) : balancesQuery.isPending ? (
                <Skeleton className="w-full" />
              ) : (
                <CurrencyBalanceList
                  balances={balances.map((line) => ({ currency: line.currency, amount: line.balance, decimalPlaces: fractionDigits(line.balance) }))}
                  emptyMessage="This group holds no account."
                />
              )}
              {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
            </>
          ) : panelMode === 'view' && viewQuery.isError ? (
            <FailedRead error={viewQuery.error} onRetry={() => void viewQuery.refetch()} />
          ) : editing ? (
            <>
              <div className={FORM_GRID}>
                <FormRow label="Code" required error={fieldErrors.code} hint={panelMode === 'create' ? 'Upper case, digits and hyphens. Becomes the account-number prefix. Cannot be changed later.' : undefined}>
                  {panelMode === 'edit' ? (
                    <ReadOnlyField locked>
                      <Mono>{draft.code}</Mono>
                    </ReadOnlyField>
                  ) : (
                    <Input
                      mono
                      aria-label="Code"
                      placeholder="ACME"
                      value={draft.code}
                      invalid={Boolean(fieldErrors.code)}
                      onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    />
                  )}
                </FormRow>
                <FormRow label="Name" required error={fieldErrors.name}>
                  <Input
                    aria-label="Name"
                    placeholder="Acme Corporation"
                    value={draft.name}
                    invalid={Boolean(fieldErrors.name)}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </FormRow>
                <FormRow label="Owner" required error={fieldErrors.ownerId} hint={panelMode === 'create' ? 'The system that owns the group. Fixed once the group is created.' : undefined}>
                  {panelMode === 'edit' ? (
                    <ReadOnlyField locked>
                      <Mono>{draft.ownerId}</Mono>
                    </ReadOnlyField>
                  ) : (
                    <Input
                      mono
                      aria-label="Owner"
                      value={draft.ownerId}
                      invalid={Boolean(fieldErrors.ownerId)}
                      onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}
                    />
                  )}
                </FormRow>
                <FormRow label="Type" required hint={panelMode === 'create' ? 'Fixed once the group is created.' : undefined}>
                  {panelMode === 'edit' ? (
                    <ReadOnlyField locked>
                      {draft.type}
                    </ReadOnlyField>
                  ) : (
                    <Select
                      aria-label="Type"
                      options={GROUP_TYPES}
                      value={draft.type}
                      className="w-full"
                      onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as AccountGroupType }))}
                    />
                  )}
                </FormRow>
                <FormRow label="Description" hint="Optional.">
                  {/* The kit's Textarea takes no aria-label; the wrapping label names it. */}
                  <label className="block">
                    <span className="sr-only">Description</span>
                    <Textarea
                      placeholder="What this group holds."
                      value={draft.description}
                      onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                </FormRow>
              </div>
              <DetailSection>Metadata</DetailSection>
              <MetadataEditor entries={draft.metadata} onChange={(entries) => setDraft((current) => ({ ...current, metadata: entries }))} />
              <Note className="mt-3">String keys and values only.</Note>
              {alertErrors.length ? <RefusalAlert errors={alertErrors} traceId={traceId} /> : null}
            </>
          ) : null}
        </DetailPanel>
      </div>
    ) : null;

  return (
    <>
      <PageHeader
        icon="folder"
        title="Account groups"
        description="Group multiple bank accounts. The group's code is the prefix of account numbers."
        actions={
          <ScopeGate scope="accounts.write" granted={canWrite}>
            <Button type="button" variant="primary" onClick={() => guardDirty(openCreate)}>
              <Plus size={14} aria-hidden="true" />
              New group
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
        searchPlaceholder="Search code, name or owner"
        searchValue={state.filters.search ?? ''}
        onSearchChange={(value) => setFilter('search', value)}
        rows={listQuery.data?.items.length}
        total={listQuery.data?.totalItemCount}
        filter={
          <FilterMenu activeCount={menuFilterCount} onClear={clearMenuFilters}>
            <FilterField label="Type">
              <Select options={[ANY, ...GROUP_TYPES]} value={state.filters.type ?? ''} className="w-full" onChange={(event) => setFilter('type', event.target.value)} />
            </FilterField>
            <FilterField label="Status">
              <Select options={[ANY, 'Active', 'Closed']} value={state.filters.status ?? ''} className="w-full" onChange={(event) => setFilter('status', event.target.value)} />
            </FilterField>
            <FilterField label="Owner">
              <Input mono aria-label="Owner filter" value={state.filters.ownerId ?? ''} onChange={(event) => setFilter('ownerId', event.target.value)} />
            </FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount: listQuery.data?.pageCount ?? 1,
          pageSize,
          pageSizeOptions: [5, 10, 25, 50],
          onPageChange: (page) => updateState({ page }),
          onPageSizeChange: (size) => updateState({ pageSize: size, page: undefined }),
        }}
        panel={panel}
      >
        {listQuery.isError ? (
          <FailedRead error={listQuery.error} onRetry={() => void listQuery.refetch()} />
        ) : (
          <LedgerTable
            columns={columns}
            rows={listQuery.data?.items ?? []}
            rowKey="id"
            selectedId={selectedId}
            onSelectRow={(row) => guardDirty(() => openView(row))}
            orderBy={state.sort?.field}
            desc={state.sort?.desc}
            onSort={(field) => updateState({ sort: { field, desc: state.sort?.field === field && !state.sort.desc } })}
            loading={listQuery.isPending}
            placeholderRows={pageSize}
            emptyMessage={emptyMessage(GROUPS_EMPTY, { total: listQuery.data?.totalItemCount ?? 0, page: currentPage, filtered: Object.values(state.filters).some(Boolean) })}
          />
        )}
      </TableCard>

      <Dialog
        open={dialog?.kind === 'close' && viewingGroup !== null}
        tone="destructive"
        title="Close account group"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button type="button" onClick={() => setDialog(null)}>
              Keep group open
            </Button>
            <Button type="button" variant="destructive" onClick={handleClose}>
              Close group
            </Button>
          </>
        }
      >
        {viewingGroup ? (
          <>
            <div>
              Closing <Mono>{viewingGroup.code}</Mono> stops any new account being opened in it. The accounts already in the group stay readable and keep their balances.
            </div>
            <Note className="mt-3">Reversible — a closed group can be reopened from this panel.</Note>
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
