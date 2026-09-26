'use client';

import { useLayoutEffect, useState } from 'react';
import type { JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { FORM_GRID, FormRow } from '@/components/admin/FormRow';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { emptyMessage, GROUPS_EMPTY } from '@/components/feedback/empty';
import { FailedRead, RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { useFlash } from '@/components/feedback/use-flash';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { usePanelState } from '@/components/feedback/use-panel-state';
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
import { accountGroupKey } from '@/lib/query/keys';
import { ACCOUNT_GROUPS_PAGE_SIZE, useAccountGroup, useAccountGroupBalances, useAccountGroupsPage } from '@/lib/query/groups';
import type { AccountGroup, AccountGroupType } from '@/lib/query/groups';
import { useActivateAccountGroup, useCloseAccountGroup, useCreateAccountGroup, useDeleteAccountGroup, useUpdateAccountGroup } from '@/lib/query/mutations';
import { pushRecent } from '@/lib/recent/store';
import { useListViewState, withFilter } from '@/lib/url-state';

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
  // The list's filters, sort, page and open group live in the page address (DRK-1760 §3 row 5).
  const [state, navigate] = useListViewState('/groups');
  const queryClient = useQueryClient();
  const canWrite = grantedScopes.includes('accounts.write');

  function clearMenuFilters(): void {
    const filters = { ...state.filters };
    for (const field of MENU_FILTERS) delete filters[field];
    navigate({ ...state, filters, page: undefined });
  }

  const selectedId = state.openRecordId ?? null;
  const [draft, setDraft] = useState<GroupDraft>(BLANK_DRAFT);
  // What the form started from: a blank draft, or the group as read — the form is dirty once they differ.
  const [editOriginal, setEditOriginal] = useState<GroupDraft>(BLANK_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const flash = useFlash();
  // `?open=<id>` (the search, a recently viewed entry) opens that group's panel on arrival.
  const panelState = usePanelState({ initialMode: selectedId ? 'view' : null, dirty: JSON.stringify(draft) !== JSON.stringify(editOriginal) });
  // Back can take the open group out of the address: a view with nothing to view is no panel.
  const panelMode = panelState.mode === 'create' || selectedId ? panelState.mode : null;

  // The pager always has a page size, so the service is always asked for exactly one page (R2).
  const pageSize = state.pageSize ?? ACCOUNT_GROUPS_PAGE_SIZE;
  const listQuery = useAccountGroupsPage({ ...state, pageSize });

  const viewQuery = useAccountGroup(selectedId);
  const viewingGroup = viewQuery.data ?? null;

  const balancesQuery = useAccountGroupBalances(selectedId, panelMode === 'view');
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

  function resetFormState(): void {
    setFieldErrors({});
    setAlertErrors([]);
    setTraceId(undefined);
  }

  /** The open group, as the address carries it. */
  function select(id: string | undefined): void {
    if (id !== state.openRecordId) navigate({ ...state, openRecordId: id });
  }

  function openCreate(): void {
    select(undefined);
    setDraft(BLANK_DRAFT);
    setEditOriginal(BLANK_DRAFT);
    panelState.show('create');
    resetFormState();
  }

  function openView(row: AccountGroup): void {
    select(row.id);
    panelState.show('view');
    resetFormState();
  }

  function openEdit(group: AccountGroup): void {
    const snapshot: GroupDraft = {
      code: group.code,
      name: group.name,
      description: group.description ?? '',
      type: group.type,
      ownerId: group.ownerId,
      metadata: recordToMetadataEntries(group.metadata),
    };
    setDraft({ ...snapshot, metadata: snapshot.metadata.map((entry) => ({ ...entry })) });
    setEditOriginal(snapshot);
    panelState.show('edit');
    resetFormState();
  }

  function closePanel(): void {
    select(undefined);
    panelState.show(null);
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
      select(result.group.id);
    }
    panelState.show('view');
    flash.show({ title: 'Group created', text: `Created ${draft.code} — ${draft.name}. No accounts are open in it yet.` });
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
    panelState.show('view');
    flash.show({ title: 'Changes saved', text: `Updated ${draft.code}. Code and currency of existing accounts are unaffected.` });
  }

  async function handleClose(): Promise<void> {
    if (!selectedId || !viewingGroup) return;
    resetFormState();
    // The dialog stays up, its confirm disabled, until the service has answered.
    const result = await closeGroup.mutate({ groupId: selectedId });
    setConfirmingClose(false);
    if (!result.ok) {
      applyViewRefusal(result.errors, result.traceId);
      return;
    }
    if (result.group) queryClient.setQueryData(accountGroupKey(result.group.id), result.group);
    flash.show({ title: 'Group closed', text: `${viewingGroup.code} is closed. Existing accounts stay readable; no new account can be opened in it.` });
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
    flash.show({ title: 'Group reopened', text: `${viewingGroup.code} is active again. New accounts can be opened in it.` });
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
      <div ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="outline-none">
        <DetailPanel
          title={panelTitle}
          onClose={() => panelState.guard(closePanel)}
          footnote={footnote}
          style={{ width: '100%', maxWidth: '100%' }}
          actions={
            panelMode === 'view' && viewingGroup ? (
              <>
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button type="button" variant="destructive" size="sm" disabled={holdsAccount || !balancesQuery.isSuccess || deleteGroup.isPending} onClick={handleDelete}>
                    Delete group
                  </Button>
                </ScopeGate>
                {viewingGroup.status === 'Closed' ? (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="primary" size="sm" disabled={activateGroup.isPending} onClick={handleReopen}>
                      Reopen group
                    </Button>
                  </ScopeGate>
                ) : (
                  <ScopeGate scope="accounts.write" granted={canWrite}>
                    <Button type="button" variant="destructive" size="sm" disabled={holdsBalance || !balancesQuery.isSuccess} onClick={() => setConfirmingClose(true)}>
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
                <Button type="button" size="sm" onClick={() => panelState.guard(closePanel)}>
                  Cancel
                </Button>
                <ScopeGate scope="accounts.write" granted={canWrite}>
                  <Button type="button" variant="primary" size="sm" disabled={createGroup.isPending || updateGroup.isPending} onClick={panelMode === 'create' ? handleCreate : handleSave}>
                    {panelMode === 'create' ? 'Create group' : 'Save changes'}
                  </Button>
                </ScopeGate>
              </>
            ) : null
          }
        >
          {panelMode === 'view' && viewingGroup ? (
            <>
              <DetailSection divider={false}>
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
            <Button type="button" variant="primary" onClick={() => panelState.guard(openCreate)}>
              <Plus size={14} aria-hidden="true" />
              New group
            </Button>
          </ScopeGate>
        }
      />

      {flash.card}

      <TableCard
        searchPlaceholder="Search code, name or owner"
        searchValue={state.filters.search ?? ''}
        onSearchChange={(value) => navigate(withFilter(state, 'search', value))}
        rows={listQuery.data?.items.length}
        total={listQuery.data?.totalItemCount}
        filter={
          <FilterMenu activeCount={menuFilterCount} onClear={clearMenuFilters}>
            <FilterField label="Type">
              <Select options={[ANY, ...GROUP_TYPES]} value={state.filters.type ?? ''} className="w-full" onChange={(event) => navigate(withFilter(state, 'type', event.target.value))} />
            </FilterField>
            <FilterField label="Status">
              <Select options={[ANY, 'Active', 'Closed']} value={state.filters.status ?? ''} className="w-full" onChange={(event) => navigate(withFilter(state, 'status', event.target.value))} />
            </FilterField>
            <FilterField label="Owner">
              <Input mono aria-label="Owner filter" value={state.filters.ownerId ?? ''} onChange={(event) => navigate(withFilter(state, 'ownerId', event.target.value))} />
            </FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount: listQuery.data?.pageCount ?? 1,
          pageSize,
          pageSizeOptions: [5, 10, 25, 50],
          onPageChange: (page) => navigate({ ...state, page }),
          onPageSizeChange: (size) => navigate({ ...state, pageSize: size, page: undefined }),
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
            onSelectRow={(row) => panelState.guard(() => openView(row))}
            orderBy={state.sort?.field}
            desc={state.sort?.desc}
            onSort={(field) => navigate({ ...state, sort: { field, desc: state.sort?.field === field && !state.sort.desc } })}
            loading={listQuery.isPending}
            placeholderRows={pageSize}
            emptyMessage={emptyMessage(GROUPS_EMPTY, { total: listQuery.data?.totalItemCount ?? 0, page: currentPage, filtered: Object.values(state.filters).some(Boolean) })}
          />
        )}
      </TableCard>

      <Dialog
        open={confirmingClose && viewingGroup !== null}
        tone="destructive"
        title="Close account group"
        onClose={() => setConfirmingClose(false)}
        footer={
          <>
            <Button type="button" onClick={() => setConfirmingClose(false)}>
              Keep group open
            </Button>
            <Button type="button" variant="destructive" disabled={closeGroup.isPending} onClick={handleClose}>
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

      {panelState.dialog}
    </>
  );
}
