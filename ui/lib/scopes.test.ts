import { describe, expect, it } from 'vitest';
import { KNOWN_SCOPES, SCOPE_CONSEQUENCES } from './scopes';

describe('scopes', () => {
  it('names the known scope set the console can display (DRK-1669 §9 Q2)', () => {
    expect(KNOWN_SCOPES).toEqual(['accounts.read', 'postings.read', 'postings.reverse']);
  });

  it('states a non-empty consequence for every known scope', () => {
    for (const scope of KNOWN_SCOPES) {
      expect(SCOPE_CONSEQUENCES[scope]).toBeTruthy();
    }
    expect(SCOPE_CONSEQUENCES['postings.reverse']).toBe('reverse a posting');
    expect(SCOPE_CONSEQUENCES['accounts.read']).toBe('view accounts');
    expect(SCOPE_CONSEQUENCES['postings.read']).toBe('view postings');
  });
});
