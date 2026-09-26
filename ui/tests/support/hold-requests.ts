import type { Page, Route } from '@playwright/test';

/**
 * DRK-1763 (brief row 14) — "the service has not yet answered". Every `method` request the
 * browser sends to a console address matching `url` is held before it leaves the browser, so
 * the console and the fake ledger see nothing until `release()` lets each held request go on
 * unchanged. Uses Playwright's own `page.route`, so the fake ledger needs no delay control.
 */
export interface HeldRequests {
  /** How many matching requests the browser has sent so far. */
  count(): number;
  /** Lets every held request (and every later one) go on to the console. */
  release(): void;
}

export async function holdRequests(page: Page, method: string, url: string | RegExp): Promise<HeldRequests> {
  let seen = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(url, async (route: Route) => {
    if (route.request().method() !== method) {
      await route.fallback();
      return;
    }
    seen += 1;
    await released;
    // The page may have closed while the request was held (the check ended on its assertion).
    await route.continue().catch(() => undefined);
  });
  return { count: () => seen, release };
}
