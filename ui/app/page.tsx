import type { JSX } from 'react';

/**
 * `GET /` — the framed console shell, no screen content. Anonymous visitors (and a
 * `notConfigured` console) are redirected before this component would render any
 * screen data (DRK-1669 §3a).
 */
export default function ConsoleHome(): JSX.Element {
  throw new Error('Not implemented');
}
