/**
 * DRK-1669 §5 — `@unit` Scenario Outline: The console renders in both themes.
 *
 * Literal surface/text colours are copied from Design/tokens/colors.css (the token file
 * is the source of truth per R2), never computed by calling production code:
 *   light — --background #fbfcf8, --foreground #0f172a
 *   dark  — --background #020617, --foreground #f8fafc
 */
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../components/shell/AppShell';
import '../../app/globals.css';
import { mockPrefersColorScheme } from './setup';

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

const EXAMPLES = [
  { preference: 'light' as const, background: '#fbfcf8', foreground: '#0f172a' },
  { preference: 'dark' as const, background: '#020617', foreground: '#f8fafc' },
];

describe('The console renders in both themes', () => {
  it.each(EXAMPLES)('uses the $preference theme when the operator has chosen no theme', ({ preference, background, foreground }) => {
    mockPrefersColorScheme(preference);

    // The operator has chosen no theme; the frame must pick up the OS preference on its
    // own. AppShell currently throws (not implemented), which is this test's RED reason.
    render(createElement(AppShell, {}));

    const bodyStyle = getComputedStyle(document.body);
    expect(bodyStyle.backgroundColor).toBe(hexToRgb(background));
    expect(bodyStyle.color).toBe(hexToRgb(foreground));
  });
});
