/**
 * DRK-1725 §5:
 *   Scenario: Every acceptance check has its own number
 *     Given the acceptance suite at the end of this change
 *     When its checks are listed
 *     Then no two checks share a number
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const ACCEPTANCE_DIR = path.resolve(fileURLToPath(import.meta.url), '../../acceptance');

test('Every acceptance check has its own number', () => {
  const checks = fs
    .readdirSync(ACCEPTANCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  const unnumbered = checks.filter((name) => !/^\d+-/.test(name));

  const byNumber = new Map<number, string[]>();
  for (const name of checks) {
    const match = /^(\d+)-/.exec(name);
    if (!match) continue;
    const number = Number(match[1]);
    byNumber.set(number, [...(byNumber.get(number) ?? []), name]);
  }
  const shared = [...byNumber]
    .filter(([, names]) => names.length > 1)
    .map(([number, names]) => `${number}: ${names.join(', ')}`);

  expect(checks.length).toBeGreaterThan(0);
  expect(unnumbered, 'acceptance checks without a number').toEqual([]);
  expect(shared, 'numbers shared by more than one acceptance check').toEqual([]);
});
