import '@testing-library/jest-dom/vitest';

/** jsdom has no `matchMedia` implementation — stub it so the theme picks up an OS preference. */
export function mockPrefersColorScheme(preference: 'light' | 'dark'): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') ? preference === 'dark' : preference === 'light',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
