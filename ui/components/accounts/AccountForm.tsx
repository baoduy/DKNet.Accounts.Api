/**
 * DRK-1696 §3 row 11 — one form, two modes. Open: group + currency + classification chosen
 * from the service's own lists, floor settings always answered, no account-number input.
 * Edit: only name, notes and the floor settings are editable — group, account number,
 * currency, external reference and classification are locked (README.md: `PUT` accepts only
 * `name`/`metadata`; everything else the service never lets an edit change).
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { routeRefusal } from '@/lib/api/refusal';
import { FloorSettings, type FloorSettingsValue } from './FloorSettings';

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
  onSubmit?: (values: AccountFormValues) => void;
  style?: CSSProperties;
}

export function AccountForm({ mode, account, groups = [], currencies = [], errors = [], onSubmit, style }: AccountFormProps): JSX.Element {
  const [name, setName] = useState(account.name);
  const [notes, setNotes] = useState(account.notes);
  const [groupId, setGroupId] = useState(groups[0]?.value ?? '');
  const [currency, setCurrency] = useState(mode === 'open' ? (currencies[0]?.value ?? '') : account.currency);
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

  const { fieldErrors, alertErrors } = routeRefusal(errors);

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
      style={style}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="flex flex-col gap-1">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Name"
          aria-invalid={fieldErrors.name ? 'true' : undefined}
        />
        {fieldErrors.name ? <span role="alert">{fieldErrors.name.message}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        Free-form notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Free-form notes" />
      </label>

      {mode === 'edit' ? (
        <label className="flex flex-col gap-1">
          Account number
          <input value={account.accountNumber} disabled aria-label="Account number" />
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        Group
        {mode === 'open' ? (
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} aria-label="Group">
            {groups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        ) : (
          <select value={account.groupName} disabled aria-label="Group">
            <option value={account.groupName}>{account.groupName}</option>
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1">
        Currency
        {mode === 'open' ? (
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Currency">
            {currencies.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <select value={account.currency} disabled aria-label="Currency">
            <option value={account.currency}>{account.currency}</option>
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1">
        Accounting classification
        {mode === 'open' ? (
          <select value={classification} onChange={(event) => setClassification(event.target.value)} aria-label="Accounting classification">
            {ACCOUNT_CLASSIFICATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <select value={account.classification} disabled aria-label="Accounting classification">
            <option value={account.classification}>{account.classification}</option>
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1">
        Outside reference
        <input value={account.externalReference} disabled aria-label="Outside reference" />
      </label>

      {mode === 'edit' ? (
        <label className="flex flex-col gap-1">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
            <option value="" disabled>
              Change status…
            </option>
            {ACCOUNT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <FloorSettings
        value={floor}
        currency={mode === 'open' ? currency : account.currency}
        onChange={setFloor}
        refusal={
          fieldErrors.OVERDRAFT_LIMIT_REQUIRED || alertErrors.find((error) => error.code === 'OVERDRAFT_LIMIT_REQUIRED') ? (
            <p role="alert">
              <span className="font-mono font-semibold">OVERDRAFT_LIMIT_REQUIRED</span>{' '}
              {alertErrors.find((error) => error.code === 'OVERDRAFT_LIMIT_REQUIRED')?.message ?? 'An overdraft limit is required.'}
            </p>
          ) : null
        }
      />

      <button type="submit">{mode === 'open' ? 'Open' : 'Save'}</button>
    </form>
  );
}
