/**
 * DRK-1696 §3 row 11 — one form, two modes. Open: group + currency + classification chosen
 * from the service's own lists, floor settings always answered, no account-number input.
 * Edit: only name, notes and the floor settings are editable — group, account number,
 * currency, external reference and classification are locked (README.md: `PUT` accepts only
 * `name`/`metadata`; everything else the service never lets an edit change).
 * DRK-1745 — the kit's two-column `FormRow` grid (Design/ui_kits/accounts-crud/Accounts.jsx).
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { useReportDirty } from '@/components/feedback/use-panel-state';
import { Button } from '@/components/ui/button';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Caption, Mono } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { routeRefusal } from '@/lib/api/refusal';
import { FloorSettings, FormRow, type FloorSettingsValue } from './FloorSettings';

export interface AccountFormAccount {
  accountNumber: string;
  groupName: string;
  name: string;
  currency: string;
  classification: string;
  externalReference: string;
  notes: string;
  overdraftLimit: string | null;
  minimumBalance: string | null;
  permittedToGoNegative: boolean;
  /** Edit mode only — absent (defaults to `Active`) for the open-mode caller, which has no
   * status to set yet (`AccountForm.test.tsx`'s fixture predates this field). */
  status?: string;
}

export interface AccountFormOption {
  value: string;
  label: string;
  /** Currencies only — the scale the floor-policy hint quotes. */
  decimalPlaces?: number;
}

export const ACCOUNT_CLASSIFICATIONS: AccountFormOption[] = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Income', label: 'Income' },
  { value: 'Expense', label: 'Expense' },
];

/** README.md: the account status enum — all 4 are offered, not only the 2 close/reopen sets
 * (decision log, "All 4 account statuses are offered, not only the 2 that close and reopen"). */
export const ACCOUNT_STATUSES = ['Active', 'Frozen', 'Dormant', 'Closed'];

export interface AccountFormValues {
  name: string;
  notes: string;
  groupId?: string;
  currency?: string;
  classification?: string;
  status?: string;
  floor: FloorSettingsValue;
}

export interface AccountFormProps {
  mode: 'open' | 'edit';
  account: AccountFormAccount;
  /** Open mode only — from the service's own lists. */
  groups?: AccountFormOption[];
  currencies?: AccountFormOption[];
  errors?: LedgerError[];
  /** Edit mode only — `false` locks Save, Status and the floor controls behind the
   * `accounts.write` scope (DRK-1704 finding 7), mirroring `ScopeGate`'s own caption. */
  writeGranted?: boolean;
  /** Set when the submit buttons live outside the form (the side panel's footer): the form
   * takes this id and draws no submit button of its own. */
  formId?: string;
  /** Edit mode — the Status select. The side panel closes and reopens from its footer instead. */
  showStatus?: boolean;
  /** Fires whenever the form moves between untouched and edited. */
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit?: (values: AccountFormValues) => void;
  style?: CSSProperties;
}

/** A field fixed once the account is open. The empty text keeps the field's own type size, so the
 * loading form (every value blank) stands exactly as tall as the loaded one (DRK-1725 R1). */
function Locked({ value }: { value: string }): JSX.Element {
  return <ReadOnlyField locked>{value ? <Mono>{value}</Mono> : <span>Not set.</span>}</ReadOnlyField>;
}

export function AccountForm({
  mode,
  account,
  groups = [],
  currencies = [],
  errors = [],
  writeGranted = true,
  formId,
  showStatus = true,
  onDirtyChange,
  onSubmit,
  style,
}: AccountFormProps): JSX.Element {
  const [name, setName] = useState(account.name);
  const [notes, setNotes] = useState(account.notes);
  const [groupId, setGroupId] = useState('');
  const [currency, setCurrency] = useState(mode === 'open' ? '' : account.currency);
  const [classification, setClassification] = useState(account.classification);
  // Starts unset, not the account's current status: a closed `<select>` displays its own
  // selected option's text as if it were on-screen content, which would otherwise restate the
  // same word the status badge elsewhere on the detail screen already shows (DRK-1696 §5
  // "An emptied account is closed" / "A closed account is reopened" check that bare word with
  // no scoping). `Save` only sends a status change once the operator has actually picked one.
  const [status, setStatus] = useState('');
  const [floor, setFloor] = useState<FloorSettingsValue>({
    permittedToGoNegative: account.permittedToGoNegative,
    overdraftLimit: account.overdraftLimit,
    minimumBalance: account.minimumBalance,
  });

  const dirty =
    name !== account.name ||
    notes !== account.notes ||
    groupId !== '' ||
    currency !== (mode === 'open' ? '' : account.currency) ||
    classification !== account.classification ||
    status !== '' ||
    floor.permittedToGoNegative !== account.permittedToGoNegative ||
    floor.overdraftLimit !== account.overdraftLimit ||
    floor.minimumBalance !== account.minimumBalance;
  useReportDirty(dirty, onDirtyChange);

  const { fieldErrors, alertErrors } = routeRefusal(errors);
  const editLocked = mode === 'edit' && !writeGranted;
  const overdraftRefusal = alertErrors.find((error) => error.code === 'OVERDRAFT_LIMIT_REQUIRED');
  const otherAlertErrors = alertErrors.filter((error) => error !== overdraftRefusal);
  const floorCurrency = mode === 'open' ? currency : account.currency;

  function submit(): void {
    onSubmit?.({
      name,
      notes,
      groupId: mode === 'open' ? groupId : undefined,
      currency: mode === 'open' ? currency : undefined,
      classification: mode === 'open' ? classification : undefined,
      status: mode === 'edit' && status !== '' ? status : undefined,
      floor,
    });
  }

  return (
    <form
      id={formId}
      style={style}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-[length:var(--text-table-size)]">
        <FormRow label="Group" required hint={mode === 'open' ? 'The group code becomes the prefix of the account number.' : null}>
          {mode === 'open' ? (
            <>
              <Select
                aria-label="Group"
                options={[{ value: '', label: 'Select a group' }, ...groups]}
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="w-full"
              />
              {fieldErrors.groupId ? <span role="alert">{fieldErrors.groupId.message}</span> : null}
            </>
          ) : (
            <Locked value={account.groupName} />
          )}
        </FormRow>

        <FormRow label="Account no.">
          {mode === 'open' ? (
            <ReadOnlyField>
              <Caption>Assigned by the service on open.</Caption>
            </ReadOnlyField>
          ) : (
            <Locked value={account.accountNumber} />
          )}
        </FormRow>

        <FormRow label="Name" required>
          <Input
            aria-label="Name"
            placeholder="Operating account"
            value={name}
            invalid={Boolean(fieldErrors.name)}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name ? <span role="alert">{fieldErrors.name.message}</span> : null}
        </FormRow>

        <FormRow label="Currency" required hint={mode === 'open' ? 'Fixed once the account is open. Every amount on it is stored at this currency’s scale.' : null}>
          {mode === 'open' ? (
            <>
              <Select
                aria-label="Currency"
                options={[{ value: '', label: 'Select a currency' }, ...currencies.map(({ value, label }) => ({ value, label }))]}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full"
              />
              {fieldErrors.currency ? <span role="alert">{fieldErrors.currency.message}</span> : null}
            </>
          ) : (
            <Locked value={account.currency} />
          )}
        </FormRow>

        <FormRow label="Classification" required={mode === 'open'}>
          {mode === 'open' ? (
            <Select
              aria-label="Classification"
              options={ACCOUNT_CLASSIFICATIONS}
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              className="w-full"
            />
          ) : (
            <Locked value={account.classification} />
          )}
        </FormRow>

        <FloorSettings
          value={floor}
          currency={floorCurrency}
          decimalPlaces={currencies.find((option) => option.value === floorCurrency)?.decimalPlaces}
          onChange={setFloor}
          disabled={editLocked}
          overdraftLimitError={fieldErrors.overdraftLimit?.message}
          minimumBalanceError={fieldErrors.minimumBalance?.message}
          refusal={
            overdraftRefusal ? (
              <p role="alert">
                <span className="font-mono font-semibold">OVERDRAFT_LIMIT_REQUIRED</span> {overdraftRefusal.message}
              </p>
            ) : null
          }
        />

        <FormRow label="External ref.">
          <Locked value={account.externalReference} />
        </FormRow>

        {mode === 'edit' && showStatus ? (
          <FormRow label="Status">
            <Select
              aria-label="Status"
              options={[{ value: '', label: 'Change status…' }, ...ACCOUNT_STATUSES]}
              value={status}
              disabled={editLocked}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full"
            />
            {fieldErrors.status ? <span role="alert">{fieldErrors.status.message}</span> : null}
          </FormRow>
        ) : null}

        <FormRow label="Notes" hint="Stored in the account’s metadata under notes.">
          <label className="block">
            <span className="sr-only">Free-form notes</span>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </FormRow>
      </div>

      {otherAlertErrors.length ? <RefusalAlert errors={otherAlertErrors} /> : null}

      {formId === undefined ? (
        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary" disabled={editLocked}>
            {mode === 'open' ? 'Open' : 'Save'}
          </Button>
          {editLocked ? <Caption>requires accounts.write</Caption> : null}
        </div>
      ) : null}
    </form>
  );
}
