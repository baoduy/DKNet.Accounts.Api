/**
 * DRK-2325 §3 row 6 — records a transfer in the side panel, mirroring `RecordPostingForm`: the
 * source starts as the screen's account, each currency comes from its account and shows locked,
 * the rate shows only across currencies and the fee account only for a fee above 0. `Review
 * transfer` opens the confirm step, which restates the transfer with its exact estimate
 * (`estimateConverted`); only its own `Record transfer` sends (R7). The idempotency key is minted
 * when the panel opens and kept through a refusal or no answer, so a retry replays.
 */
'use client';

import { useRef, useState, type JSX } from 'react';
import { FORM_GRID, FormRow } from '@/components/admin/FormRow';
import { DetailPanel } from '@/components/feedback/DetailPanel';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { useReportDirty } from '@/components/feedback/use-panel-state';
import { IdempotencyKeyField } from '@/components/forms/IdempotencyKeyField';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { Currency } from '@/components/ledger/Currency';
import { formatAmount, isNegativeAmount } from '@/components/ledger/Money';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Caption, Mono, Note } from '@/components/ui/text';
import type { AccountDto } from '@/lib/accounts/query';
import { isZeroAmount } from '@/lib/api/money-json';
import { isUnreachable, NO_ANSWER_ERROR, RECORD_TRANSFER_CODE_FIELDS, routeRefusalByCode } from '@/lib/api/refusal';
import { useDecimalPlaces } from '@/lib/query/currencies';
import { estimateConverted } from '@/lib/transfers/estimate';
import type { TransferDto } from '@/lib/transfers/query';
import { useRecordTransfer } from '@/lib/transfers/record';

const DEFAULT_FEE = '0';

/** A fee above 0 needs a fee account; an empty or non-numeric fee is left for the service to judge. */
function feeAboveZero(fee: string): boolean {
  return /^\d+(\.\d+)?$/.test(fee) && !isZeroAmount(fee);
}

export interface RecordTransferFormProps {
  /** The account select's accounts — every choice in the panel comes from them. */
  accounts: AccountDto[];
  /** The screen's account: where the source starts. */
  sourceAccountId: string;
  granted: boolean;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Called once the service recorded the transfer (201, or 200 replaying it) — never before. */
  onRecorded: (transfer: TransferDto) => void;
}

function accountOption(account: AccountDto): { value: string; label: string } {
  return { value: account.id, label: `${account.accountNumber} — ${account.name}` };
}

/** "ACME-000105 is frozen." for a chosen account that is not active. */
function statusHint(account: AccountDto | undefined): string | undefined {
  const status = account?.status.toLowerCase();
  return account && status !== 'active' ? `${account.accountNumber} is ${status}.` : undefined;
}

export function RecordTransferForm({ accounts, sourceAccountId, granted, onClose, onDirtyChange, onRecorded }: RecordTransferFormProps): JSX.Element {
  const [sourceId, setSourceId] = useState(sourceAccountId);
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState(DEFAULT_FEE);
  const [feeAccountId, setFeeAccountId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const reviewButton = useRef<HTMLButtonElement>(null);

  const idempotency = useIdempotencyKey();
  const record = useRecordTransfer();
  const decimalPlacesOf = useDecimalPlaces();
  const { fieldErrors, alertErrors } = routeRefusalByCode(errors, RECORD_TRANSFER_CODE_FIELDS);

  const source = accounts.find((account) => account.id === sourceId);
  const destinations = accounts.filter((account) => account.id !== sourceId);
  const destination = destinations.find((account) => account.id === destinationId);
  const feeAccounts = destinations.filter((account) => account.currency === source?.currency);
  const feeAccount = feeAccounts.find((account) => account.id === feeAccountId);
  const needsRate = Boolean(source && destination && source.currency !== destination.currency);
  const needsFeeAccount = feeAboveZero(fee);
  const canReview = granted && !record.isPending && Boolean(source && destination && amount) && (!needsRate || rate !== '') && (!needsFeeAccount || feeAccount !== undefined);

  const dirty = Boolean(amount || destinationId || rate || feeAccountId || fee !== DEFAULT_FEE || sourceId !== sourceAccountId);
  useReportDirty(dirty, onDirtyChange);

  const destinationPlaces = destination ? decimalPlacesOf(destination.currency) : undefined;
  const estimate = destination && destinationPlaces !== undefined ? estimateConverted(amount, fee, needsRate ? rate : null, destinationPlaces) : null;

  async function handleConfirm(): Promise<void> {
    if (!source || !destination) return;
    setConfirming(false);
    try {
      const result = await record.mutate({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount,
        sourceCurrency: source.currency,
        destinationCurrency: destination.currency,
        exchangeRate: needsRate ? rate : undefined,
        fee,
        feeAccountId: needsFeeAccount ? feeAccount?.id : undefined,
        idempotencyKey: idempotency.value,
        regenerateIdempotencyKey: idempotency.regenerate,
      });
      if (result.ok) {
        setErrors([]);
        onRecorded(result.transfer);
      } else {
        // The pass-through's unreachable answer means the service never answered this write.
        setErrors(isUnreachable(result.errors) ? [NO_ANSWER_ERROR] : (result.errors ?? []));
      }
    } catch {
      setErrors([NO_ANSWER_ERROR]);
    }
  }

  const accountSelect = (name: string, value: string, options: AccountDto[], onChange: (id: string) => void, error?: LedgerError): JSX.Element => (
    <Select
      aria-label={name}
      options={[{ value: '', label: 'Select an account' }, ...options.map(accountOption)]}
      value={value}
      invalid={Boolean(error)}
      className="w-full"
      onChange={(event) => onChange(event.target.value)}
    />
  );
  const lockedCurrency = (name: string, account: AccountDto | undefined): JSX.Element => (
    <ReadOnlyField locked={account !== undefined} aria-label={name}>
      {account ? <Currency code={account.currency} /> : <Caption>Taken from the account.</Caption>}
    </ReadOnlyField>
  );

  return (
    <>
      <DetailPanel
        title="Record transfer"
        onClose={onClose}
        actions={
          <>
            <Button type="button" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button ref={reviewButton} type="button" size="sm" variant="primary" disabled={!canReview} onClick={() => setConfirming(true)}>
              Review transfer
            </Button>
          </>
        }
      >
        <div className={FORM_GRID}>
          <FormRow label="Source" required hint={statusHint(source)} error={fieldErrors.sourceAccountId}>
            {accountSelect('Source account', sourceId, accounts, setSourceId, fieldErrors.sourceAccountId)}
          </FormRow>
          <FormRow label="Currency">{lockedCurrency('Source currency', source)}</FormRow>
          <FormRow label="Destination" required hint={statusHint(destination)} error={fieldErrors.destinationAccountId}>
            {accountSelect('Destination account', destination?.id ?? '', destinations, setDestinationId, fieldErrors.destinationAccountId)}
          </FormRow>
          <FormRow label="Currency">{lockedCurrency('Destination currency', destination)}</FormRow>
          <FormRow label="Amount" required hint="Total leaving the source, fee included." error={fieldErrors.amount}>
            <Input numeric aria-label="Amount" placeholder="0.00" value={amount} invalid={Boolean(fieldErrors.amount)} onChange={(event) => setAmount(event.target.value)} />
          </FormRow>
          {needsRate ? (
            <FormRow label="Rate" required hint={`1 ${source?.currency} in ${destination?.currency}.`} error={fieldErrors.exchangeRate}>
              <Input numeric aria-label="Rate" placeholder="0.00" value={rate} invalid={Boolean(fieldErrors.exchangeRate)} onChange={(event) => setRate(event.target.value)} />
            </FormRow>
          ) : null}
          <FormRow label="Fee" hint="Taken out of the amount, in the source currency." error={fieldErrors.fee}>
            <Input numeric aria-label="Fee" value={fee} invalid={Boolean(fieldErrors.fee)} onChange={(event) => setFee(event.target.value)} />
          </FormRow>
          {needsFeeAccount ? (
            <FormRow label="Fee account" required error={fieldErrors.feeAccountId}>
              {accountSelect('Fee account', feeAccount?.id ?? '', feeAccounts, setFeeAccountId, fieldErrors.feeAccountId)}
            </FormRow>
          ) : null}
        </div>
        <div className="mt-5">
          <IdempotencyKeyField value={idempotency.value} note="Prevents a duplicate transfer if this request is retried." />
        </div>
        <RefusalAlert errors={alertErrors} className="mt-4" />
      </DetailPanel>

      <Dialog
        open={confirming}
        title="Confirm this transfer"
        onClose={() => setConfirming(false)}
        // Back, Escape or a sent transfer: focus returns to `Review transfer`, never to the page body.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          reviewButton.current?.focus();
        }}
        footer={
          <>
            <Button type="button" onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button type="button" variant="primary" className="ml-auto" onClick={() => void handleConfirm()}>
              Record transfer
            </Button>
          </>
        }
      >
        <p className="m-0">
          {/* A typed value is restated exactly as typed; only the estimate is worked out. */}
          Send <b className="tabular-nums">{`${amount} ${source?.currency ?? ''}`}</b> from <Mono>{source?.accountNumber}</Mono> to <Mono>{destination?.accountNumber}</Mono>
          {needsRate ? (
            <>
              {' '}
              at a rate of <b className="tabular-nums">{rate}</b>
            </>
          ) : null}
          , with a fee of <b className="tabular-nums">{`${fee} ${source?.currency ?? ''}`}</b>
          {needsFeeAccount ? (
            <>
              {' '}
              to <Mono>{feeAccount?.accountNumber}</Mono>
            </>
          ) : null}
          .
        </p>
        <p className="mt-3 mb-0">
          {estimate !== null ? (
            <>
              {destination?.accountNumber} gets an estimated <b className="tabular-nums">{`${isNegativeAmount(estimate) ? '−' : ''}${formatAmount(estimate, destinationPlaces)} ${destination?.currency}`}</b>.
            </>
          ) : (
            'The estimate cannot be worked out: the amount, the fee and the rate must each be a number.'
          )}
        </p>
        <Note className="mt-3">Recording is immediate and final. The ledger works out the converted amount it records; this estimate uses the same rule.</Note>
      </Dialog>
    </>
  );
}
