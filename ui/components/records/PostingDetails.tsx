/**
 * DRK-1713 §3 row 7 — one posting's details in the side panel: the link between a posting and
 * its reversal with the reversal's reason (the service stores the reason once, as the
 * reversal's description, so a reversed posting reads it by following the link), and the
 * shared reverse action in the panel footer.
 *
 * DRK-1745 §3 row 6 (Design/ui_kits/records-crud) — the kit's sections: Movement, References,
 * Reversal lineage and Audit, with the footnote saying why Reverse is or is not offered. Only
 * what the service's posting carries is drawn: it has no counterparty, transaction group,
 * external reference, metadata or recorded-by field, so those rows are left out. A reversal
 * is refused on a reversal by the console alone — the service sends no code for it, so none
 * is shown.
 */
'use client';

import type { JSX, ReactNode } from 'react';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { Chip } from '@/components/ui/chip';
import { Caption, Mono } from '@/components/ui/text';
import { ReversePostingForm, type ReversedPosting } from '@/components/accounts/ReversePostingForm';
import { usePosting, type PostingDto } from '@/lib/accounts/query';
import { DirectionBadge, formatDate, SignedAmount } from './RecordsTable';

export interface PostingDetailsProps {
  posting: PostingDto;
  accountNumber: string;
  accountName?: string;
  decimalPlaces?: number;
  /** The Records screen names the account; the account's own screen does not. */
  showAccount?: boolean;
  reverseGranted: boolean;
  onClose: () => void;
  onReversed?: (reversed: ReversedPosting) => void;
}

const NOT_SET = <Caption>Not set.</Caption>;

export function PostingDetails({ posting, accountNumber, accountName, decimalPlaces, showAccount = true, reverseGranted, onClose, onReversed }: PostingDetailsProps): JSX.Element {
  const linked = usePosting(posting.reversedByPostingId || posting.reversesPostingId).data;
  const linkedNumber = linked?.postingNumber ?? '';
  const reason = posting.reversesPostingId ? posting.description : linked?.description;
  const row = { ...posting, decimalPlaces };

  let footnote: ReactNode = 'Records are immutable. Reversing records an opposing entry; it does not edit or delete this row.';
  if (posting.reversedByPostingId) {
    footnote = (
      <>
        Already reversed by <Mono>{linkedNumber}</Mono> — reversing again is refused with <Mono>POSTING_ALREADY_REVERSED</Mono>.
      </>
    );
  } else if (posting.reversesPostingId) {
    footnote = (
      <>
        This record is itself a reversal of <Mono>{linkedNumber}</Mono>. A reversal is corrected by recording a new posting, never by reversing it.
      </>
    );
  }

  return (
    <DetailPanel
      title={
        <span className="flex min-w-0 flex-col gap-1.5">
          <Mono>{posting.postingNumber}</Mono>
          <span className="inline-flex items-center gap-2">
            {posting.category ? <Chip>{posting.category}</Chip> : null}
            <StatusBadge status={posting.status} />
          </span>
        </span>
      }
      onClose={onClose}
      footnote={footnote}
      actions={
        <ReversePostingForm
          key={posting.id}
          accountId={posting.accountId}
          accountNumber={accountNumber}
          accountName={accountName}
          postingId={posting.id}
          postingNumber={posting.postingNumber}
          amount={posting.amount}
          currency={posting.currency}
          decimalPlaces={decimalPlaces}
          direction={posting.direction === 'Debit' ? 'Debit' : 'Credit'}
          reversedByPostingId={posting.reversedByPostingId}
          reversesPostingId={posting.reversesPostingId}
          granted={reverseGranted}
          onReversed={onReversed}
        />
      }
    >
      <DetailSection divider={false} style={{ marginTop: 0 }}>
        Movement
      </DetailSection>
      <DetailList
        items={[
          { label: 'Direction', value: <DirectionBadge direction={posting.direction} /> },
          { label: 'Amount', value: <SignedAmount row={row} showCurrency /> },
          ...(showAccount ? [{ label: 'Account', value: <Mono>{accountNumber}</Mono> }] : []),
          { label: 'Effective', value: posting.effectiveDate ? formatDate(posting.effectiveDate) : NOT_SET },
          { label: 'Category', value: posting.category ?? NOT_SET },
        ]}
      />
      <DetailSection>References</DetailSection>
      <DetailList items={[{ label: 'Description', value: posting.description || NOT_SET }]} />
      {posting.reversedByPostingId || posting.reversesPostingId ? (
        <>
          <DetailSection>Reversal lineage</DetailSection>
          <div className="border-l-3 border-l-primary pl-3 text-[length:var(--text-table-size)]">
            {posting.reversedByPostingId ? (
              <>
                Reversed by <Mono>{linkedNumber}</Mono>. Both rows stay on the account; the balance reflects the pair.
              </>
            ) : (
              <>
                Reverses <Mono>{linkedNumber}</Mono>. This is the correcting entry, not a deletion.
              </>
            )}
            {reason ? <div className="mt-2 text-muted-foreground">Reason: {reason}</div> : null}
          </div>
        </>
      ) : null}
      <DetailSection>Audit</DetailSection>
      <DetailList items={[{ label: 'Stream position', value: <Mono>{posting.streamPosition}</Mono> }]} />
    </DetailPanel>
  );
}
