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
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { useChangeAccountDetails } from '@/lib/accounts/mutations';
import { AccountForm, type AccountFormValues } from './AccountForm';
import { PostingsPanel, type PostingsPanelFilter, type PostingsPanelRow } from './PostingsPanel';
import { RecordPostingForm } from './RecordPostingForm';
import { ReversePostingForm } from './ReversePostingForm';

export interface AccountDetailAccount {
  accountNumber: string;
  name: string;
  currency: string;
  decimalPlaces: number;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  floor: string;
  status: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  groupName?: string;
  externalReference?: string;
  notes?: string;
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
  style?: CSSProperties;
}

function AccountEditPanel({ accountId, account }: { accountId: string; account: AccountDetailAccount }): JSX.Element {
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const changeDetails = useChangeAccountDetails();

  async function handleSubmit(values: AccountFormValues): Promise<void> {
    const result = await changeDetails.mutate({ accountId, name: values.name });
    setErrors(result.ok ? [] : (result.errors ?? []));
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
      }}
      errors={errors}
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
  style,
}: AccountDetailProps): JSX.Element {
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  // While the record form is open, its own locked `Account`/`Currency`/`Direction`/`Category`
  // fields would otherwise collide with the edit form's locked fields and the postings
  // panel's narrowing selects (Playwright `getByLabel` matches by substring, e.g. `Direction`
  // matches `Direction filter` too, and a plain `hidden` attribute does not remove a control
  // from that match set) — unmounted, not just hidden, while the record form is open.
  const [recordFormOpen, setRecordFormOpen] = useState(false);

  if (!account) {
    return (
      <div style={style}>
        <p>Account not found.</p>
      </div>
    );
  }

  const decimalPlaces = account.decimalPlaces;
  const selectedPosting = postings.find((posting) => posting.id === selectedPostingId) ?? null;

  return (
    <div style={style} className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1" data-testid="account-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Balance</span>
          <Money amount={account.balance} decimalPlaces={decimalPlaces} size="tile" align="left" />
        </div>
        <div className="flex flex-col gap-1" data-testid="account-available-balance">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Available</span>
          <Money amount={account.availableBalance} decimalPlaces={decimalPlaces} size="tile" align="left" />
        </div>
        <div className="flex flex-col gap-1" data-testid="account-held-amount">
          <span className="text-[length:var(--text-label-size)] text-muted-foreground">Held</span>
          <Money amount={account.heldAmount} decimalPlaces={decimalPlaces} size="tile" align="left" />
        </div>
      </div>

      <div data-testid="account-floor">
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
      </div>

      {accountId && !recordFormOpen ? <AccountEditPanel accountId={accountId} account={account} /> : null}

      {!recordFormOpen ? (
        <PostingsPanel
          rows={postings}
          from={postingsFrom}
          to={postingsTo}
          filter={postingsFilter}
          onFilterChange={onPostingsFilterChange}
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
          onOpenChange={setRecordFormOpen}
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
