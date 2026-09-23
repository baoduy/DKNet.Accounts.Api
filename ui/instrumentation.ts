/**
 * Runs once when a Next.js server instance starts — including the standalone `server.js`
 * this image ships, which never re-evaluates `next.config.ts`'s exported function (that
 * only runs for the `next dev`/`next build`/`next start` CLIs). This is the one hook the
 * standalone bundle actually calls, so it is where R8 has to be enforced for that runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadConfig } = await import('@/lib/config');
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
}
