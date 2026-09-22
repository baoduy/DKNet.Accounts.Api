import React from 'react';
import { Currency } from './Currency.jsx';
import { Money } from './Money.jsx';
import { Note } from '../core/Label.jsx';

export function CurrencyBalanceList({ balances = [], emptyMessage = 'No accounts in this group yet.', style, ...rest }) {
  return (
    <div style={style} {...rest}>
      {balances.length === 0 ? <Note>{emptyMessage}</Note> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {balances.map((b) => (
              <tr key={b.currency}>
                <td style={{ fontSize: 'var(--text-table-size)', padding: '9px 12px 9px 0', borderBottom: '1px solid var(--border)' }}>
                  <Currency code={b.currency} />
                </td>
                <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                  <Money amount={b.amount} decimalPlaces={b.decimalPlaces != null ? b.decimalPlaces : 2} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Note style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
        Balances are reported per currency and are never combined into a single total.
      </Note>
    </div>
  );
}
