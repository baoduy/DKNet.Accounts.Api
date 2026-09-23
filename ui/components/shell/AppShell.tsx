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
export function AppShell(props: AppShellProps): JSX.Element {
  throw new Error('Not implemented');
}
