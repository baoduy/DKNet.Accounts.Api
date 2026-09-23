import type { JSX } from 'react';

/** Shown at `/` instead of the console shell when the directory values are blank (R9). */
export default function NotConfiguredPage(): JSX.Element {
  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--page-padding)',
        textAlign: 'center',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div>
        <h1 style={{ fontSize: 'var(--text-page-title-size)', fontWeight: 'var(--weight-bold)' }}>Sign-in is not configured</h1>
        <p style={{ color: 'var(--muted-foreground)', marginTop: 'var(--space-3)' }}>
          Set <code>CONSOLE_ENTRA_TENANT_ID</code> and <code>CONSOLE_ENTRA_CLIENT_ID</code> to enable sign-in.
        </p>
      </div>
    </main>
  );
}
