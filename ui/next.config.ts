import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import type { NextConfig } from 'next';
import { loadConfig } from './lib/config';

// `next dev`/`next start` load this file synchronously before anything else — a throw here
// is a fatal, unrecoverable startup error (unlike an `instrumentation.ts` error, which Next
// only logs and keeps the dev server running past). `next build` never has runtime env
// available (R9 config is read from the environment, never baked into the image), so this
// validates on every phase except that one.
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) {
    loadConfig();
  }

  return {
    output: 'standalone',
    // The acceptance suite runs several `next dev` instances against this same checkout,
    // one at a time, on different ports (the shared `webServer` plus per-scenario restarts).
    // Without this they'd all write into the same `.next/`, corrupting each other's dev
    // build manifests. Production always runs one prebuilt image — never `next dev` — so
    // this never applies there.
    ...(phase === PHASE_DEVELOPMENT_SERVER && process.env.CONSOLE_PORT
      ? { distDir: `.next-${process.env.CONSOLE_PORT}` }
      : {}),
    // A folder named `__a11y-harness__` is a Next.js "private folder" (leading underscore)
    // and is excluded from routing entirely, so the page lives at `a11y-harness-internal/`
    // and is rewritten back to the URL the acceptance suite (frozen) actually requests.
    async rewrites() {
      return [{ source: '/__a11y-harness__', destination: '/a11y-harness-internal' }];
    },
  };
}
