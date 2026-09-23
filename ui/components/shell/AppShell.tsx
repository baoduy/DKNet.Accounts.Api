'use client';

import { useLayoutEffect } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';

export interface AppShellProps {
  sidebar?: ReactNode;
  breadcrumb?: ReactNode;
  topbarRight?: ReactNode;
  panel?: ReactNode;
  panelOpen?: boolean;
  panelBehavior?: 'overlay' | 'shift';
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * The console frame: fixed left navigation (`Sidebar`), fixed top bar (search field +
 * `UserMenu`), and a page header above the content region. Ported from
 * Design/components/shell/AppShell.jsx.
 */
export function AppShell({
  sidebar,
  breadcrumb,
  topbarRight,
  panel,
  panelOpen = false,
  panelBehavior = 'overlay',
  children,
  style,
}: AppShellProps): JSX.Element {
  // No stored theme choice exists (out of scope this ticket) — the frame picks up the OS
  // preference itself, on every render, the same way the CSS `@media` block would. jsdom
  // (the unit-test harness) cannot resolve `var()` in a computed `background`/`color`
  // shorthand, so this reads the already-resolved custom properties and mirrors them onto
  // `document.body` inline — real browsers already get the same values from base.css alone.
  useLayoutEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    const rootStyle = getComputedStyle(document.documentElement);
    document.body.style.backgroundColor = rootStyle.getPropertyValue('--background').trim();
    document.body.style.color = rootStyle.getPropertyValue('--foreground').trim();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100%', position: 'relative', overflow: 'hidden', background: 'var(--background)', ...style }}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          minWidth: 0,
          paddingRight: panelOpen && panelBehavior === 'shift' ? 'var(--drawer-width)' : 0,
          transition: 'padding-right var(--duration-panel) var(--easing-panel)',
        }}
      >
        {sidebar}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              height: 'var(--topbar-height)',
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '0 var(--page-padding)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--card)',
            }}
          >
            {breadcrumb}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{topbarRight}</div>
          </header>
          <main style={{ padding: 'var(--page-padding)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', overflowX: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
      {panel}
    </div>
  );
}
