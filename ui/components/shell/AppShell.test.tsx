import { render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';
import '../../app/globals.css';

/**
 * A real, dispatchable `MediaQueryList` fake (unlike `tests/unit/setup.ts`'s frozen stub,
 * whose listeners are permanently no-ops) — this is what proves A4: an OS theme change
 * flips the frame live, with no reload.
 */
function installControllableMatchMedia(initialMatches: boolean): { flip: () => void } {
  let matches = initialMatches;
  const target = new EventTarget();
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (type: string, listener: EventListener) => target.addEventListener(type, listener),
    removeEventListener: (type: string, listener: EventListener) => target.removeEventListener(type, listener),
    dispatchEvent: (event: Event) => target.dispatchEvent(event),
  };
  window.matchMedia = (() => mql) as unknown as typeof window.matchMedia;
  return {
    flip: () => {
      matches = !matches;
      target.dispatchEvent(new Event('change'));
    },
  };
}

describe('AppShell — live OS theme changes (A4)', () => {
  afterEach(() => {
    document.documentElement.dataset.theme = '';
  });

  it('flips the frame when the OS theme changes, with no reload', () => {
    const media = installControllableMatchMedia(false);
    render(createElement(AppShell, {}));

    expect(document.documentElement.dataset.theme).toBe('light');
    const lightBg = document.body.style.backgroundColor;

    media.flip();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.body.style.backgroundColor).not.toBe(lightBg);
  });

  it('removes its media-query listener on unmount', () => {
    const media = installControllableMatchMedia(false);
    const { unmount } = render(createElement(AppShell, {}));
    expect(document.documentElement.dataset.theme).toBe('light');

    unmount();
    // A flip after unmount only leaves `theme` unchanged if the effect's cleanup actually
    // removed the listener; a missing `return () => mql.removeEventListener(...)` leaks the
    // listener and this still fires, flipping `theme` to 'dark' even with no mounted AppShell.
    media.flip();

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
