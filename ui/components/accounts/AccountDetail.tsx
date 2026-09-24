/**
 * DRK-1696 §3 row 7 — the account detail screen: the three values + floor, the postings
 * panel, and the record/reverse/edit surfaces, fed from already-fetched props so this
 * renders with no query provider (`AccountDetailScreen` owns the fetching, `lib/accounts/
 * query.ts`). The record/reverse/edit surfaces mount only once `accountId` is supplied —
 * each composes a write hook (`lib/query/mutations.ts`, `lib/accounts/mutations.ts`) that
 * needs a `QueryClientProvider`, so they stay unmounted for a caller (this file's own unit
 * test) that never supplies one.
 *
 * R2 — an address matching no account (`account: null`) renders a plain not-found message
 * and nothing else: never another account's balance (DRK-1696 §5 "An address naming no
 * account says so").
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { FloorLine } from '@/components/ledger/FloorLine';
import { Money } from '@/components/ledger/Money';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { useChangeAccountDetails, useSetAccountControls } from '@/lib/accounts/mutations';
import { AccountForm, type AccountFormValues } from './AccountForm';
import { AccountStatusControl } from './AccountStatusControl';
import { PostingsPanel, type PostingsPanelFilter, type PostingsPanelRow } from './PostingsPanel';
import { RecordPostingForm } from './RecordPostingForm';
import { ReversePostingForm } from './ReversePostingForm';

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
  externalReference?: string;
  notes?: string;
  /** The account's whole metadata map — `PUT` replaces it wholesale (`Account.cs:144-146`), so a
   * notes change resends every other key with it. */
  metadata?: Record<string, string>;
  classification?: string;
}

export interface AccountDetailProps {
  /** `null` — never a fall-back to another account's data — when the address names no account. */
  account: AccountDetailAccount | null;
  /** The account's own guid. Gates the write surfaces (see file comment); absent in the
   * presentational unit test, always supplied by `AccountDetailScreen`. */
  accountId?: string;
  grantedScopes?: string[];
  postings?: PostingsPanelRow[];
  postingsFrom?: string;
  postingsTo?: string;
  postingsFilter?: PostingsPanelFilter;
  onPostingsFilterChange?: (filter: PostingsPanelFilter) => void;
  onPostingsPeriodChange?: (from: string, to: string) => void;
  style?: CSSProperties;
}

function AccountEditPanel({ accountId, account, writeGranted }: { accountId: string; account: AccountDetailAccount; writeGranted: boolean }): JSX.Element {
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
  accountId,
  grantedScopes = [],
  postings = [],
  postingsFrom = '',
  postingsTo = '',
  postingsFilter,
  onPostingsFilterChange,
  onPostingsPeriodChange,
  style,
}: AccountDetailProps): JSX.Element {
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);

  if (!account) {
    return (
      <div style={style}>
        <p>Account not found.</p>
      </div>
    );
  }

  const decimalPlaces = account.decimalPlaces;
  const scaleKnown = decimalPlaces !== undefined;
  const selectedPosting = postings.find((posting) => posting.id === selectedPostingId) ?? null;
  const writeGranted = grantedScopes.includes('accounts.write');

  return (
    <div style={style} className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1" data-testid="account-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Balance</span>
          {scaleKnown ? <Money amount={account.balance} decimalPlaces={decimalPlaces} size="tile" align="left" /> : null}
        </div>
        <div className="flex flex-col gap-1" data-testid="account-available-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Available</span>
          {scaleKnown ? <Money amount={account.availableBalance} decimalPlaces={decimalPlaces} size="tile" align="left" /> : null}
        </div>
        <div className="flex flex-col gap-1" data-testid="account-held-amount">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Held</span>
          {scaleKnown ? <Money amount={account.heldAmount} decimalPlaces={decimalPlaces} size="tile" align="left" /> : null}
        </div>
      </div>

      <div data-testid="account-floor">
        {scaleKnown ? (
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

      <div className="flex items-center gap-3">
        <span data-testid="account-status">
          <StatusBadge status={account.status} />
        </span>
        {accountId ? (
          <AccountStatusControl
            accountId={accountId}
            status={account.status}
            balance={account.balance}
            heldAmount={account.heldAmount}
            currency={account.currency}
            decimalPlaces={decimalPlaces}
            granted={writeGranted}
          />
        ) : null}
      </div>

      {accountId ? <AccountEditPanel accountId={accountId} account={account} writeGranted={writeGranted} /> : null}

      {scaleKnown ? (
        <PostingsPanel
          rows={postings}
          from={postingsFrom}
          to={postingsTo}
          filter={postingsFilter}
          onFilterChange={onPostingsFilterChange}
          onPeriodChange={onPostingsPeriodChange}
          selectedId={selectedPostingId}
          onSelectRow={(row) => setSelectedPostingId(row.id === selectedPostingId ? null : row.id)}
        />
      ) : null}

      {accountId ? (
        <RecordPostingForm
          accountId={accountId}
          accountNumber={account.accountNumber}
          currency={account.currency}
          granted={grantedScopes.includes('postings.write')}
        />
      ) : null}

      {accountId && selectedPosting ? (
        <ReversePostingForm
          accountId={accountId}
          accountNumber={account.accountNumber}
          postingId={selectedPosting.id}
          postingNumber={selectedPosting.postingNumber}
          amount={selectedPosting.amount}
          currency={selectedPosting.currency}
          decimalPlaces={selectedPosting.decimalPlaces}
          direction={selectedPosting.direction === 'Debit' ? 'Debit' : 'Credit'}
          granted={grantedScopes.includes('postings.reverse')}
        />
      ) : null}
    </div>
  );
}
