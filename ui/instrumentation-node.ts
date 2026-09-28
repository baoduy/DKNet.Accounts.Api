import { loadConfig } from '@/lib/config';

// Node-only half of `instrumentation.ts`. Turbopack (Next 16's default bundler) also compiles
// `instrumentation.ts` for the Edge runtime and fails it on any Node API it finds there, even
// behind a runtime check — so `process.exit` lives here, imported only on the Node runtime.
try {
  loadConfig();
} catch (error) {
  // A thrown/rejected register() is only logged, never fatal, even for the standalone
  // production server (`node server.js` keeps listening after printing the error) — a
  // real process exit is the only thing that actually stops it here.
  // eslint-disable-next-line no-console
  console.error((error as Error).message);
  process.exit(1);
}
