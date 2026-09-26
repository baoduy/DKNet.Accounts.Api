import type { JSX } from 'react';

/** Shown at `/` instead of the console shell when the directory values are blank (R9). */
export default function NotConfiguredPage(): JSX.Element {
  return (
    <main className="flex min-h-full items-center justify-center bg-background p-(--page-padding) text-center text-foreground">
      <div>
        <h1 className="text-page-title font-bold">Sign-in is not configured</h1>
        <p className="mt-3 text-muted-foreground">
          Set <code>CONSOLE_ENTRA_TENANT_ID</code> and <code>CONSOLE_ENTRA_CLIENT_ID</code> to enable sign-in.
        </p>
      </div>
    </main>
  );
}
