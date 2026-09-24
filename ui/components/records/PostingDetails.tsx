/**
 * DRK-1713 §3 row 7 — one posting's details beside the Records list: the never-edited
 * statement, the link between a posting and its reversal with the reversal's reason (the
 * service stores the reason once, as the reversal's description, so a reversed posting reads
 * it by following the link), and the shared reverse form.
 */
'use client';

import type { JSX } from 'react';
import { Money } from '@/components/ledger/Money';
import { NEVER_EDITED_STATEMENT, ReversePostingForm } from '@/components/accounts/ReversePostingForm';
import { usePosting, type PostingDto } from '@/lib/accounts/query';

export interface PostingDetailsProps {
  posting: PostingDto;
  accountNumber: string;
  decimalPlaces?: number;
  reverseGranted: boolean;
}

export function PostingDetails({ posting, accountNumber, decimalPlaces, reverseGranted }: PostingDetailsProps): JSX.Element {
  const linked = usePosting(posting.reversedByPostingId || posting.reversesPostingId).data;
  const reason = posting.reversesPostingId ? posting.description : linked?.description;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-mono font-semibold">{posting.postingNumber}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt>Account</dt>
        <dd>{accountNumber}</dd>
        <dt>Direction</dt>
        <dd>{posting.direction}</dd>
        <dt>Category</dt>
        <dd>{posting.category ?? ''}</dd>
        <dt>Amount</dt>
        <dd>{decimalPlaces === undefined ? `${posting.amount} ${posting.currency}` : <Money amount={posting.amount} currency={posting.currency} decimalPlaces={decimalPlaces} showCurrency />}</dd>
        <dt>Effective date</dt>
        <dd>{posting.effectiveDate ?? ''}</dd>
        <dt>Status</dt>
        <dd>{posting.status}</dd>
        {!posting.reversesPostingId && posting.description ? (
          <>
            <dt>Description</dt>
            <dd>{posting.description}</dd>
          </>
        ) : null}
      </dl>

      {posting.reversedByPostingId ? <p>Reversed by {linked?.postingNumber ?? ''}</p> : null}
      {posting.reversesPostingId ? <p>Reverses {linked?.postingNumber ?? ''}</p> : null}
      {reason ? <p>Reason: {reason}</p> : null}

      <p>{NEVER_EDITED_STATEMENT}</p>

      <ReversePostingForm
        key={posting.id}
        accountId={posting.accountId}
        accountNumber={accountNumber}
        postingId={posting.id}
        postingNumber={posting.postingNumber}
        amount={posting.amount}
        currency={posting.currency}
        decimalPlaces={decimalPlaces}
        direction={posting.direction === 'Debit' ? 'Debit' : 'Credit'}
        reversedByPostingId={posting.reversedByPostingId}
        reversesPostingId={posting.reversesPostingId}
        granted={reverseGranted}
      />
    </div>
  );
}
