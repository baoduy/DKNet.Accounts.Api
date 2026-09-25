import { describe, expect, it } from 'vitest';
import { classifySearch, SEARCH_CAPTIONS } from './classify';

describe('classifySearch', () => {
  it('routes a UUID, in any case, as an identifier', () => {
    expect(classifySearch('6D1E4F0A-2B3C-4D5E-8F90-A1B2C3D4E5F6')).toEqual({ route: 'identifier', value: '6D1E4F0A-2B3C-4D5E-8F90-A1B2C3D4E5F6' });
  });

  it('does not take a UUID with a character too many for an identifier', () => {
    expect(classifySearch('6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f67').route).toBe('text');
    expect(classifySearch('x6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6').route).toBe('text');
  });

  it('routes an account number as one, upper-cased', () => {
    expect(classifySearch('acme-000123')).toEqual({ route: 'accountNumber', value: 'ACME-000123' });
  });

  it.each([
    ['a group code of 3 and 3 characters after the dash', 'FEE-REF', 'accountNumber'],
    ['a group code of 5 and 10 characters after the dash', 'ABCDE-0123456789', 'accountNumber'],
    ['a group code of 2 characters', 'AB-000123', 'text'],
    ['a group code of 6 characters', 'ABCDEF-000123', 'text'],
    ['2 characters after the dash', 'ACME-12', 'text'],
    ['11 characters after the dash', 'ACME-01234567890', 'text'],
    ['a space inside', 'ACME 000123', 'text'],
    ['text before it', 'x ACME-000123', 'text'],
    ['text after it', 'ACME-000123 x', 'text'],
  ])('takes %s as %s', (_, typed, route) => {
    expect(classifySearch(typed).route).toBe(route);
  });

  it('trims what was typed before routing it', () => {
    expect(classifySearch('  Acme  ')).toEqual({ route: 'text', value: 'Acme' });
    expect(classifySearch('  acme-000123 ')).toEqual({ route: 'accountNumber', value: 'ACME-000123' });
  });

  it('sends nothing shorter than 2 characters, spaces not counted', () => {
    expect(classifySearch('A')).toEqual({ route: 'tooShort', value: 'A' });
    expect(classifySearch(' A ')).toEqual({ route: 'tooShort', value: 'A' });
    expect(classifySearch('Ac').route).toBe('text');
  });
});

describe('SEARCH_CAPTIONS', () => {
  it('states each route in the words the spec pins', () => {
    expect(SEARCH_CAPTIONS).toEqual({
      identifier: 'Looked up as an account, then a group, then a posting.',
      accountNumber: 'Matched as an account number.',
      text: 'Searched across accounts and groups.',
      tooShort: 'A search needs at least 2 characters.',
    });
  });
});
