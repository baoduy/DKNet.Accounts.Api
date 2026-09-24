/**
 * DRK-1725 §3 "The end-to-end check" — starts this run's own stack and publishes it to the
 * checks, and removes it when the run ends, pass or fail (contract: `stack.ts`). Built in the
 * end-to-end Build stage; until then every end-to-end check fails here.
 */
export default async function globalSetup(): Promise<void> {
  throw new Error('Not implemented: the end-to-end runner does not start a stack yet');
}
