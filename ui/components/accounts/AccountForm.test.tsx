/**
 * DRK-1696 §5:
 *   Scenario Outline: Only the fields the service accepts are editable
 *     | field                      | state    |
 *     | name                       | editable |
 *     | free-form notes            | editable |
 *     | overdraft limit            | editable |
 *     | smallest permitted balance | editable |
 *     | group                      | locked   |
 *     | account number             | locked   |
 *     | currency                   | locked   |
 *     | outside reference          | locked   |
 *     | accounting classification  | locked   |
 *
 * README.md: `PUT /v1/accounts/{id}` accepts only `name`/`metadata`; `PATCH` accepts only
 * `status`/`overdraftLimit`/`minimumBalance`/`permittedToGoNegative`. Everything else the
 * service never lets an edit change. RED today: `components/accounts/AccountForm.tsx` does
 * not exist.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountForm, type AccountFormAccount } from './AccountForm';

const ACCOUNT: AccountFormAccount = {
  accountNumber: 'ACME-000123',
  groupName: 'ACME',
  name: 'Operating account',
  currency: 'SGD',
  classification: 'Liability',
  externalReference: 'PO-4471',
  notes: '',
  overdraftLimit: null,
  minimumBalance: null,
  permittedToGoNegative: false,
};

describe('Only the fields the service accepts are editable', () => {
  it.each([
    { field: 'Name', editable: true },
    { field: 'Free-form notes', editable: true },
    { field: 'Overdraft limit', editable: true },
    { field: 'Smallest permitted balance', editable: true },
    { field: 'Group', editable: false },
    { field: 'Account number', editable: false },
    { field: 'Currency', editable: false },
    { field: 'Outside reference', editable: false },
    { field: 'Accounting classification', editable: false },
  ])('the $field field is editable: $editable', ({ field, editable }) => {
    render(createElement(AccountForm, { mode: 'edit', account: { ...ACCOUNT, permittedToGoNegative: true, overdraftLimit: '5000.00' } }));
    const control = screen.getByLabelText(field);
    if (editable) {
      expect(control).toBeEnabled();
    } else {
      expect(control).toBeDisabled();
    }
  });
});
