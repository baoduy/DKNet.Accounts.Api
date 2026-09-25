/**
 * DRK-1696 §3 row 7 — the account detail screen: the three values + floor, the postings
 * panel, and the record/reverse/edit surfaces, fed from already-fetched props so this
 * renders with no query provider (`AccountDetailScreen` owns the fetching, `lib/accounts/
 * query.ts`). The record/reverse/edit surfaces mount only once `accountId` is supplied —
 * each composes a write hook (`lib/query/mutations.ts`, `lib/accounts/mutations.ts`) that
 * needs a `QueryClientProvider`, so they stay unmounted for a caller (this file's own unit
 * test) that never supplies one.
 *
 * DRK-1745 §3 rows 2, 6, 9, 10 (Design/ui_kits/account-detail) — the kit's page header (number,
 * the account's line, status, `Edit <number>` and `Record posting`, the latter disabled with its
 * reason unless the account is active or dormant), acknowledgements above the tiles, and one
 * side panel over the postings card that views a posting, records one or edits the account.
 *
 * R2 — an address matching no account (`account: null`) renders a plain not-found message
 * and nothing else: never another account's balance (DRK-1696 §5 "An address naming no
 * account says so").
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { FloorLine } from '@/components/ledger/FloorLine';
import { Money } from '@/components/ledger/Money';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { Acknowledgement } from '@/components/feedback/Acknowledgement';
import { DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { PostingDetails } from '@/components/records/PostingDetails';
import { formatDate } from '@/components/records/RecordsTable';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mono, Note } from '@/components/ui/text';
import { useChangeAccountDetails, useSetAccountControls } from '@/lib/accounts/mutations';
import type { PostingDto } from '@/lib/accounts/query';
import { AccountForm, type AccountFormValues } from './AccountForm';
import { AccountStatusControl } from './AccountStatusControl';
import { PostingsPanel, type PostingsPanelFilter, type PostingsPanelProps, type PostingsPanelRow } from './PostingsPanel';
import { RecordPostingForm, recordedText, useUnsentGuard } from './RecordPostingForm';
import { reversedText } from './ReversePostingForm';

export interface AccountDetailAccount {
  accountNumber: string;
  name: string;
  currency: string;
  /** The currency's own scale — absent until the currency read has answered, and no amount is
   * drawn until then (never a guessed 2). */
  decimalPlaces?: number;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  /** Absent while the balance read is pending or refused — `FloorLine` falls back to its own
   * `computeFloor` off the floor-policy fields below rather than showing a guessed `0`. */
  floor?: string;
  status: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  groupName?: string;
  /** The group's code, as the kit's header line names it. */
  groupCode?: string;
  externalReference?: string;
  notes?: string;
  /** The account's whole metadata map — `PUT` replaces it wholesale (`Account.cs:144-146`), so a
   * notes change resends every other key with it. */
  metadata?: Record<string, string>;
  classification?: string;
  openedOn?: string;
}

/** What the side panel shows: a posting's id, `new` (record one) or `edit` (the account). */
export const OPEN_NEW = 'new';
export const OPEN_EDIT = 'edit';

export interface AccountDetailProps {
  /** `null` — never a fall-back to another account's data — when the address names no account;
   * `undefined` while the account is still being read, drawn as placeholders in its final shape. */
  account: AccountDetailAccount | null | undefined;
  /** The number the address names — the header's title while the account is still being read. */
  accountNumber?: string;
  /** The account's own guid. Gates the write surfaces (see file comment); absent in the
   * presentational unit test, always supplied by `AccountDetailScreen`. */
  accountId?: string;
  grantedScopes?: string[];
  postings?: PostingsPanelRow[];
  /** The statement is still being read. */
  postingsLoading?: boolean;
  postingsFailure?: PostingsPanelProps['failure'];
  postingsEmptyMessage?: string;
  postingsPage?: number;
  postingsPageCount?: number;
  postingsPageSize?: number;
  postingsTotal?: number;
  onPostingsPageChange?: (page: number) => void;
  onPostingsPageSizeChange?: (size: number) => void;
  postingsPeriod?: string;
  onPostingsPeriodChange?: (period: string) => void;
  postingsFilter?: PostingsPanelFilter;
  onPostingsFilterChange?: (filter: PostingsPanelFilter) => void;
  postingsSearch?: string;
  onPostingsSearchChange?: (search: string) => void;
  postingsOrderBy?: string;
  postingsDesc?: boolean;
  onPostingsSort?: (field: string) => void;
  /** The side panel's content, as the address carries it (`?open=`). */
  open?: string;
  onOpenChange?: (open: string | undefined) => void;
  /** The posting `open` names, once read. */
  openPosting?: PostingDto;
  style?: CSSProperties;
}

/** The service's own refusal for a posting against an account in that status. */
const NOT_POSTABLE_CODE: Record<string, string> = { frozen: 'ACCOUNT_FROZEN', closed: 'ACCOUNT_CLOSED' };

function AccountEditPanel({ accountId, account, writeGranted, onSaved }: { accountId: string; account: AccountDetailAccount; writeGranted: boolean; onSaved: () => void }): JSX.Element {
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const changeDetails = useChangeAccountDetails();
  const setControls = useSetAccountControls();

  async function handleSubmit(values: AccountFormValues): Promise<void> {
    // Only the endpoint the changed field actually belongs to is called — `PUT` accepts
    // just `name`/`metadata`, `PATCH` just `status`/floor settings (README.md) — never both
    // concurrently when only one half of the form changed. The service has no dedicated
    // "notes" field, so the free-form text rides in `metadata.notes` (DRK-1704 finding 4).
    const errors: LedgerError[] = [];
    const nameChanged = values.name !== account.name;
    const notesChanged = values.notes !== (account.notes ?? '');
    if (nameChanged || notesChanged) {
      const nameResult = await changeDetails.mutate({
        accountId,
        name: nameChanged ? values.name : undefined,
        metadata: notesChanged ? { ...account.metadata, notes: values.notes } : undefined,
      });
      if (!nameResult.ok) errors.push(...(nameResult.errors ?? []));
    }
    const controlsResult = await setControls.mutate({
      accountId,
      status: values.status,
      overdraftLimit: values.floor.overdraftLimit,
      minimumBalance: values.floor.minimumBalance,
      permittedToGoNegative: values.floor.permittedToGoNegative,
    });
    if (!controlsResult.ok) errors.push(...(controlsResult.errors ?? []));
    setErrors(errors);
    if (errors.length === 0) onSaved();
  }

  return (
    <AccountForm
      mode="edit"
      account={{
        accountNumber: account.accountNumber,
        groupName: account.groupName ?? '',
        name: account.name,
        currency: account.currency,
        classification: account.classification ?? '',
        externalReference: account.externalReference ?? '',
        notes: account.notes ?? '',
        overdraftLimit: account.overdraftLimit ?? null,
        minimumBalance: account.minimumBalance ?? null,
        permittedToGoNegative: account.permittedToGoNegative,
        status: account.status,
      }}
      errors={errors}
      writeGranted={writeGranted}
      onSubmit={handleSubmit}
    />
  );
}

export function AccountDetail({
  account,
  accountNumber,
  accountId,
  grantedScopes = [],
  postings = [],
  postingsLoading = false,
  postingsFailure,
  postingsEmptyMessage,
  postingsPage,
  postingsPageCount,
  postingsPageSize,
  postingsTotal,
  onPostingsPageChange,
  onPostingsPageSizeChange,
  postingsPeriod,
  onPostingsPeriodChange,
  postingsFilter,
  onPostingsFilterChange,
  postingsSearch,
  onPostingsSearchChange,
  postingsOrderBy,
  postingsDesc,
  onPostingsSort,
  open,
  onOpenChange,
  openPosting,
  style,
}: AccountDetailProps): JSX.Element {
  const [flash, setFlash] = useState<{ title: string; text: JSX.Element | string } | null>(null);
  const unsent = useUnsentGuard(open === OPEN_NEW);
  const writable = Boolean(account && accountId);
  const panelOpen = writable && (open === OPEN_NEW || open === OPEN_EDIT || openPosting !== undefined);
  const panelRef = usePanelFocus<HTMLDivElement>(panelOpen);

  if (account === null) {
    return (
      <div style={style} className="flex flex-col gap-5">
        {accountNumber ? <PageHeader icon="wallet" title={accountNumber} /> : null}
        <p>Account not found.</p>
      </div>
    );
  }

  const loading = account === undefined;
  const decimalPlaces = account?.decimalPlaces;
  const scaleKnown = decimalPlaces !== undefined;
  const writeGranted = grantedScopes.includes('accounts.write');
  const number = account?.accountNumber ?? accountNumber ?? '';
  const status = account?.status.toLowerCase() ?? '';
  const postable = status === 'active' || status === 'dormant';
  const closePanel = (): void => onOpenChange?.(undefined);
  // While the account is read each value is a placeholder of the height it will take, so nothing
  // moves when it arrives (DRK-1725 R1).
  const tile = (amount: string | undefined): JSX.Element | null =>
    loading ? <Skeleton className="w-32" /> : scaleKnown ? <Money amount={amount!} decimalPlaces={decimalPlaces} size="tile" align="left" /> : null;

  let panel: JSX.Element | null = null;
  if (account && accountId && open === OPEN_EDIT) {
    panel = (
      <DetailPanel title={`Edit ${account.accountNumber}`} onClose={closePanel} footnote="Group, account number, currency, classification and external reference are fixed once the account is open.">
        <AccountEditPanel
          accountId={accountId}
          account={account}
          writeGranted={writeGranted}
          onSaved={() => {
            closePanel();
            setFlash({ title: 'Changes saved', text: `Updated ${account.accountNumber}. Group, account number and currency are unchanged; no posting was made.` });
          }}
        />
        <DetailSection>Close or reopen</DetailSection>
        <AccountStatusControl
          accountId={accountId}
          status={account.status}
          balance={account.balance}
          heldAmount={account.heldAmount}
          currency={account.currency}
          decimalPlaces={decimalPlaces}
          granted={writeGranted}
        />
      </DetailPanel>
    );
  } else if (account && accountId && open === OPEN_NEW) {
    panel = (
      <RecordPostingForm
        account={{ id: accountId, accountNumber: account.accountNumber, name: account.name, currency: account.currency, status: account.status, balance: account.balance }}
        granted={grantedScopes.includes('postings.write')}
        onClose={() => unsent.guard(closePanel)}
        onDirtyChange={unsent.onDirtyChange}
        onRecorded={(recorded) => {
          unsent.clear();
          closePanel();
          setFlash({ title: 'Record posted', text: recordedText(recorded) });
        }}
      />
    );
  } else if (account && accountId && openPosting) {
    panel = (
      <PostingDetails
        posting={openPosting}
        accountNumber={account.accountNumber}
        accountName={account.name}
        decimalPlaces={decimalPlaces}
        showAccount={false}
        reverseGranted={grantedScopes.includes('postings.reverse')}
        onClose={closePanel}
        onReversed={(reversed) => setFlash({ title: 'Record reversed', text: reversedText(reversed) })}
      />
    );
  }

  const description = account
    ? [account.name, account.groupCode || account.groupName ? `group ${account.groupCode || account.groupName}` : '', account.currency, account.classification ?? '', account.openedOn ? `opened ${formatDate(account.openedOn)}` : '']
        .filter(Boolean)
        .join(' · ')
    : // The line keeps its height while the account is read, so nothing below it moves (DRK-1725 R1).
      '\u00a0';

  return (
    <div style={style} className="flex flex-col gap-5">
      <PageHeader
        icon="wallet"
        title={number}
        description={description}
        actions={
          account ? (
            <>
              <span data-testid="account-status">
                <StatusBadge status={account.status} />
              </span>
              <Button type="button" aria-label={`Edit ${account.accountNumber}`} title="Edit account" disabled={!accountId} onClick={() => unsent.guard(() => onOpenChange?.(OPEN_EDIT))}>
                <Pencil size={14} aria-hidden="true" />
              </Button>
              <ScopeGate scope="postings.write" granted={grantedScopes.includes('postings.write')}>
                <Button type="button" variant="primary" disabled={!postable || !accountId} onClick={() => onOpenChange?.(OPEN_NEW)}>
                  <Plus size={14} aria-hidden="true" />
                  Record posting
                </Button>
              </ScopeGate>
            </>
          ) : (
            <Skeleton className="h-9 w-40" />
          )
        }
      />

      {account && !postable ? (
        <Note>
          {account.accountNumber} is {status} — recording is refused{NOT_POSTABLE_CODE[status] ? <> with <Mono>{NOT_POSTABLE_CODE[status]}</Mono></> : null}. Its records stay readable.
        </Note>
      ) : null}

      {flash ? (
        <Acknowledgement title={flash.title} onDismiss={() => setFlash(null)}>
          {flash.text}
        </Acknowledgement>
      ) : null}

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1" data-testid="account-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Balance</span>
          {tile(account?.balance)}
        </div>
        <div className="flex flex-col gap-1" data-testid="account-available-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Available</span>
          {tile(account?.availableBalance)}
        </div>
        <div className="flex flex-col gap-1" data-testid="account-held-amount">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Held</span>
          {tile(account?.heldAmount)}
        </div>
      </div>

      <div data-testid="account-floor">
        {loading ? <Skeleton className="w-64" /> : null}
        {account && scaleKnown ? (
          <FloorLine
            account={{
              permittedToGoNegative: account.permittedToGoNegative,
              overdraftLimit: account.overdraftLimit,
              minimumBalance: account.minimumBalance,
              currency: account.currency,
              decimalPlaces,
            }}
            decimalPlaces={decimalPlaces}
            floor={account.floor}
          />
        ) : null}
      </div>

      {/* Hidden only once the currency list has answered without this account's currency: no
          posting is ever drawn at a guessed scale. */}
      {loading || scaleKnown || postingsFailure || postingsLoading ? (
        <PostingsPanel
          rows={postings}
          loading={loading || postingsLoading}
          failure={postingsFailure}
          emptyMessage={postingsEmptyMessage}
          page={postingsPage}
          pageCount={postingsPageCount}
          pageSize={postingsPageSize}
          total={postingsTotal}
          onPageChange={onPostingsPageChange}
          onPageSizeChange={onPostingsPageSizeChange}
          period={postingsPeriod}
          onPeriodChange={onPostingsPeriodChange}
          filter={postingsFilter}
          onFilterChange={onPostingsFilterChange}
          search={postingsSearch}
          onSearchChange={onPostingsSearchChange}
          orderBy={postingsOrderBy}
          desc={postingsDesc}
          onSort={onPostingsSort}
          selectedId={openPosting?.id ?? null}
          onSelectRow={(row) => unsent.guard(() => onOpenChange?.(row.id === openPosting?.id ? undefined : row.id))}
          panel={
            panel ? (
              // The kit's AppShell draws the panel full height over the frame's right edge
              // (Design/components/shell/AppShell.jsx): held to the viewport, so a short list never clips
              // it and a long one scrolls beneath it. Sized as the panel, so the focus it takes lands there.
              <div ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="fixed inset-y-0 right-0 z-50 w-(--drawer-width) max-w-[92%] outline-none">
                {panel}
              </div>
            ) : null
          }
        />
      ) : null}
      <Note>
        This table sorts, so it is not a statement. <Mono>Balance after</Mono> is carried in stream order on the account&apos;s statement, where the sequence is what makes the running balance
        true.
      </Note>

      {unsent.dialog}
    </div>
  );
}
