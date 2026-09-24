import type { CSSProperties, ReactNode } from 'react';

/**
 * The console frame. Body padding is 24px and sections stack with a 20px gap.
 */
export interface AppShellProps {
  /** A `<Sidebar>`. */
  sidebar?: ReactNode;
  /** A `<Breadcrumb>` for the top bar. */
  breadcrumb?: ReactNode;
  /** Search field, user menu. */
  topbarRight?: ReactNode;
  /** A `<DetailPanel>`. Rendered outside the content region so it slides in over the edge. */
  panel?: ReactNode;
  /** Whether the panel is open. Only affects layout when `panelBehavior="shift"`. */
  panelOpen?: boolean;
  /** `overlay` (default) slides the panel over the content. `shift` pushes the content left by `--drawer-width`. */
  panelBehavior?: 'overlay' | 'shift';
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function AppShell(props: AppShellProps): JSX.Element;
