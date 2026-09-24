/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: The end-to-end check leaves a developer's stack alone, pass or fail
 *     Given a developer's own stack is running from this checkout, holding the account DEV-000001
 *     When the end-to-end check runs and <outcome>
 *     Then the developer's stack still runs and still holds DEV-000001
 *     And nothing the check started is left running
 *
 *     Examples:
 *       | outcome |
 *       | passes  |
 *       | fails   |
 *
 * The developer's stack runs from a checkout set up from `.env.sample`
 * (`support/developer-stack.ts`), and the end-to-end check is run from that same checkout as a
 * developer runs it, `pnpm run test:e2e`, narrowed to check 170 so it does not start this check
 * again. It fails the way a real check fails once its stack is
 * up: check 170 given a 1 ms timeout. "Nothing left" is read from docker by the project the run
 * was told to use (`CONSOLE_E2E_RUN_ID`) — containers, volumes and networks — and that project
 * must have been seen running, so a run that never started a stack cannot pass. RED today: the
 * end-to-end runner does not start a stack.
 */
import { expect, test } from '@playwright/test';
import { composeResources } from './support/stack';
import { type DeveloperStack, developerServices, developerStackHolds, removeDeveloperStack, runEndToEndCheck, startDeveloperStack } from './support/developer-stack';

const MAIN_PATH = 'tests/e2e/170-the-main-path-works-end-to-end-on-the-real-stack.spec.ts';
const RUN_TIMEOUT_MS = 20 * 60_000;

// Each check starts a developer's stack and a whole end-to-end run beside it.
test.describe.configure({ timeout: 35 * 60_000 });

let developer: DeveloperStack | undefined;

test.beforeEach(async () => {
  developer = await startDeveloperStack();
  expect(Object.values(developerServices(developer)).every(Boolean)).toBe(true);
  expect(await developerStackHolds(developer, 'DEV-000001')).toBe(true);
});

test.afterEach(() => {
  if (developer) removeDeveloperStack(developer);
  developer = undefined;
});

async function expectDeveloperStackUntouched(stack: DeveloperStack, servicesBefore: Record<string, boolean>): Promise<void> {
  expect(developerServices(stack)).toEqual(servicesBefore);
  expect(await developerStackHolds(stack, 'DEV-000001')).toBe(true);
}

test("The end-to-end check leaves a developer's stack alone, pass or fail — passes", async () => {
  const servicesBefore = developerServices(developer!);

  const run = await runEndToEndCheck(developer!.checkout, [MAIN_PATH], RUN_TIMEOUT_MS);

  expect(run.code, run.output).toBe(0);
  expect(run.stackSeenRunning, run.output).toBe(true);
  await expectDeveloperStackUntouched(developer!, servicesBefore);
  expect(composeResources(run.project)).toEqual({ containers: [], volumes: [], networks: [] });
});

test("The end-to-end check leaves a developer's stack alone, pass or fail — fails", async () => {
  const servicesBefore = developerServices(developer!);

  const run = await runEndToEndCheck(developer!.checkout, [MAIN_PATH, '--timeout=1'], RUN_TIMEOUT_MS);

  expect(run.code, run.output).not.toBe(0);
  expect(run.output).toContain('Test timeout of 1ms exceeded');
  expect(run.stackSeenRunning, run.output).toBe(true);
  await expectDeveloperStackUntouched(developer!, servicesBefore);
  expect(composeResources(run.project)).toEqual({ containers: [], volumes: [], networks: [] });
});
