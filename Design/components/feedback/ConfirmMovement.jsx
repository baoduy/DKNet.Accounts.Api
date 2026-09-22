import React from 'react';
import { Dialog } from './Dialog.jsx';
import { Button } from '../core/Button.jsx';
import { formatAmount } from '../ledger/Money.jsx';

/**
 * The restate-in-words dialog used by record, batch and reverse. It restates the
 * movement rather than echoing the form: a number read twice in the same layout is a
 * number read once.
 */
export function ConfirmMovement({
  open = true, direction, amount, currency, decimalPlaces = 2,
  accountNumber, accountName, effectiveDate, category,
  legs, consequence, onBack, onConfirm, confirmLabel = 'Record posting'
}) {
  const mono = { fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-bold)' };
  return (
    <Dialog open={open} title={legs ? 'Confirm this batch' : 'Confirm this movement'} onClose={onBack}
      footer={<>
        <Button onClick={onBack}>Back</Button>
        <Button variant="primary" style={{ marginLeft: 'auto' }} onClick={onConfirm}>{confirmLabel}</Button>
      </>}>
      {legs ? (
        <>
          <div>All-or-nothing: a refusal on any leg leaves the whole batch unrecorded.</div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
            {legs.map((l, i) => (
              <li key={i} style={{ marginTop: i ? 4 : 0 }}>
                {l.direction} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(l.amount, l.decimalPlaces != null ? l.decimalPlaces : decimalPlaces)} {l.currency}</b>{' '}
                {l.direction === 'Debit' ? 'from' : 'to'} <b style={mono}>{l.accountNumber}</b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div>
          {direction} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(amount, decimalPlaces)} {currency}</b>{' '}
          {direction === 'Debit' ? 'from' : 'to'} <b style={mono}>{accountNumber}</b>
          {accountName ? <> · {accountName}</> : null},<br />
          effective <b>{effectiveDate}</b>{category ? <>, category <b>{category}</b></> : null}.
        </div>
      )}
      {consequence ? (
        <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)', color: 'var(--muted-foreground)' }}>{consequence}</div>
      ) : null}
    </Dialog>
  );
}
