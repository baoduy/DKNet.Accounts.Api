/**
 * DRK-1696 §3 row 10 — permitted-to-go-negative, overdraft limit and smallest permitted
 * balance presented as one decision under one label. Not permitted to go negative → the
 * overdraft limit is disabled and any typed value is cleared, never left dangling.
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import { Input } from '@/components/ui/input';

export interface FloorSettingsValue {
  permittedToGoNegative: boolean;
  overdraftLimit: string | null;
  minimumBalance: string | null;
}

export interface FloorSettingsProps {
  value: FloorSettingsValue;
  currency: string;
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

  return (
    <fieldset
      role="group"
      aria-label="Floor settings"
      data-testid="floor-settings"
      style={style}
      className="flex flex-col gap-3 rounded-md border border-border p-4"
    >
      <legend className="px-1 font-semibold">Floor settings</legend>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          aria-label="Permitted to go negative"
          checked={value.permittedToGoNegative}
          disabled={disabled}
          onChange={(event) => setPermittedToGoNegative(event.target.checked)}
        />
        Permitted to go negative
      </label>

      <label className="flex flex-col gap-1">
        Overdraft limit
        <Input
          aria-label="Overdraft limit"
          aria-invalid={overdraftLimitError ? 'true' : undefined}
          value={value.overdraftLimit ?? ''}
          disabled={disabled || !value.permittedToGoNegative}
          onChange={(event) => onChange({ ...value, overdraftLimit: event.target.value === '' ? null : event.target.value })}
        />
        {overdraftLimitError ? <span role="alert">{overdraftLimitError}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        Smallest permitted balance
        <Input
          aria-label="Smallest permitted balance"
          aria-invalid={minimumBalanceError ? 'true' : undefined}
          value={value.minimumBalance ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, minimumBalance: event.target.value === '' ? null : event.target.value })}
        />
        {minimumBalanceError ? <span role="alert">{minimumBalanceError}</span> : null}
      </label>

      {refusal}
    </fieldset>
  );
}
