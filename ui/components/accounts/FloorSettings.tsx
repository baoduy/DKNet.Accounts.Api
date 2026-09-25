/**
 * DRK-1696 §3 row 10 — permitted-to-go-negative, overdraft limit and smallest permitted
 * balance presented as one decision under one label. Not permitted to go negative → the
 * overdraft limit is unavailable and any typed value is cleared, never left dangling.
 * DRK-1745 — laid out as the kit's `Floor policy` rows (Design/ui_kits/accounts-crud/Accounts.jsx).
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Caption, Note } from '@/components/ui/text';

export interface FormRowProps {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children?: ReactNode;
}

/** One row of the kit's two-column form grid: the caption on the left, the control and its hint on the right. */
export function FormRow({ label, hint, required = false, children }: FormRowProps): JSX.Element {
  return (
    <>
      <Caption className="pt-2">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-debit">
            *
          </span>
        ) : null}
      </Caption>
      <div className="min-w-0">
        {children}
        {hint ? <Note className="mt-1.5">{hint}</Note> : null}
      </div>
    </>
  );
}

export interface FloorSettingsValue {
  permittedToGoNegative: boolean;
  overdraftLimit: string | null;
  minimumBalance: string | null;
}

export interface FloorSettingsProps {
  value: FloorSettingsValue;
  currency: string;
  /** The currency's scale, for the overdraft hint; omitted while it is unknown. */
  decimalPlaces?: number;
  onChange: (value: FloorSettingsValue) => void;
  /** A field-less refusal (e.g. `OVERDRAFT_LIMIT_REQUIRED`), shown against this group. */
  refusal?: ReactNode;
  /** A refusal named to this specific field (`overdraftLimit`/`minimumBalance`), marked on it
   * rather than in the group-level `refusal` slot (DRK-1704 finding 3). */
  overdraftLimitError?: string;
  minimumBalanceError?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export function FloorSettings({
  value,
  currency,
  decimalPlaces,
  onChange,
  refusal,
  overdraftLimitError,
  minimumBalanceError,
  disabled = false,
  style,
}: FloorSettingsProps): JSX.Element {
  function setPermittedToGoNegative(permittedToGoNegative: boolean): void {
    onChange({
      permittedToGoNegative,
      overdraftLimit: permittedToGoNegative ? value.overdraftLimit : null,
      minimumBalance: value.minimumBalance,
    });
  }

  const scale = currency && decimalPlaces !== undefined ? `${currency} at ${decimalPlaces} decimal places.` : 'At the currency’s scale.';

  return (
    // The form grid's own columns (`AccountForm`), so its rows line up with the rows around it.
    <fieldset
      role="group"
      aria-label="Floor policy"
      data-testid="floor-settings"
      style={style}
      className="col-span-2 m-0 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-0 p-0"
    >
      <FormRow
        label="Floor policy"
        hint={value.permittedToGoNegative ? 'An overdraft limit is required while this is on — the floor is −limit.' : 'The floor is the minimum balance, or zero when none is set.'}
      >
        <Checkbox
          checked={value.permittedToGoNegative}
          disabled={disabled}
          onChange={(event) => setPermittedToGoNegative(event.target.checked)}
          label="Permitted to go negative"
        />
      </FormRow>

      <FormRow label="Overdraft limit" required={value.permittedToGoNegative} hint={value.permittedToGoNegative ? `Unsigned. ${scale}` : null}>
        {value.permittedToGoNegative ? (
          <Input
            numeric
            aria-label="Overdraft limit"
            placeholder="50000.00"
            invalid={Boolean(overdraftLimitError)}
            value={value.overdraftLimit ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, overdraftLimit: event.target.value === '' ? null : event.target.value })}
            className="w-40"
          />
        ) : (
          <ReadOnlyField>
            <Caption>Unavailable while the account may not go negative.</Caption>
          </ReadOnlyField>
        )}
        {overdraftLimitError ? <span role="alert">{overdraftLimitError}</span> : null}
      </FormRow>

      <FormRow label="Minimum balance" hint="Optional. Sent as null when left empty.">
        <Input
          numeric
          aria-label="Minimum balance"
          placeholder="0.00"
          invalid={Boolean(minimumBalanceError)}
          value={value.minimumBalance ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, minimumBalance: event.target.value === '' ? null : event.target.value })}
          className="w-40"
        />
        {minimumBalanceError ? <span role="alert">{minimumBalanceError}</span> : null}
      </FormRow>

      {refusal ? <div className="col-span-2">{refusal}</div> : null}
    </fieldset>
  );
}
