/**
 * DRK-2325 §3 row 6 — one transfer in the side panel: every field the service keeps for it, then
 * the postings it recorded, read-only (2, or 4 with a fee), each with its posting number, account,
 * direction, category and amount.
 */
'use client';

import type { JSX } from 'react';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { DirectionBadge } from '@/components/records/RecordsTable';
import { Caption, Mono } from '@/components/ui/text';
import type { PostingDto } from '@/lib/accounts/query';
import type { TransferRowDto } from '@/lib/transfers/query';
import { amountText, type TransferView } from './TransfersTable';

export interface TransferDetailsProps {
  transfer: TransferRowDto;
  view: TransferView;
  /** Absent until the transfer's own read has answered. */
  postings?: PostingDto[];
  postingsError: unknown;
  onRetry: () => void;
  accountNumberOf: (id: string) => string;
  placesOf: (code: string) => number | undefined;
  onClose: () => void;
}

export function TransferDetails({ transfer, view, postings, postingsError, onRetry, accountNumberOf, placesOf, onClose }: TransferDetailsProps): JSX.Element {
  let lines: JSX.Element;
  if (postingsError) {
    lines = <FailedRead error={postingsError} onRetry={onRetry} />;
  } else if (!postings) {
    lines = <Caption>Reading the postings…</Caption>;
  } else {
    lines = (
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-table">
        {postings.map((posting) => (
          <li key={posting.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Mono className="font-semibold">{posting.postingNumber}</Mono>
            <Mono>{accountNumberOf(posting.accountId)}</Mono>
            <DirectionBadge direction={posting.direction} />
            <span>{posting.category}</span>
            <span className="ml-auto tabular-nums">{amountText(posting.amount, posting.currency, placesOf(posting.currency))}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DetailPanel title={<Mono>{transfer.idempotencyKey}</Mono>} onClose={onClose}>
      <DetailSection divider={false}>Transfer</DetailSection>
      <DetailList
        items={[
          { label: 'Source account', value: <Mono>{view.source}</Mono> },
          { label: 'Destination account', value: <Mono>{view.destination}</Mono> },
          { label: 'Amount', value: view.amount },
          { label: 'Source currency', value: transfer.sourceCurrency },
          { label: 'Destination currency', value: transfer.destinationCurrency },
          { label: 'Rate', value: view.rate },
          { label: 'Fee', value: view.fee },
          { label: 'Fee account', value: view.feeAccount ? <Mono>{view.feeAccount}</Mono> : <Caption>Not set.</Caption> },
          { label: 'Converted amount', value: view.converted },
        ]}
      />
      <DetailSection>References</DetailSection>
      <DetailList
        items={[
          { label: 'Id', value: <Mono>{transfer.id}</Mono> },
          { label: 'Recorded at', value: `${view.recordedAt} UTC` },
          { label: 'Calling system', value: transfer.callingSystem },
          { label: 'Idempotency key', value: <Mono>{transfer.idempotencyKey}</Mono> },
        ]}
      />
      <DetailSection>Postings</DetailSection>
      {lines}
    </DetailPanel>
  );
}
