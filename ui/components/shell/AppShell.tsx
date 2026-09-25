import type { CSSProperties, JSX, ReactNode } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

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
 * Design/components/shell/AppShell.jsx onto shadcn primitives.
 *
 * Theme follows the operator's system preference from the CSS cascade alone
 * (`Design/tokens/base.css`, `colors.css`'s `@media (prefers-color-scheme: dark)` block) —
 * no JS reads or mirrors it (AT 21, dev-leader ruling on DRK-1680 row 9 amendment).
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
  return (
    // `overflow-clip`, not `overflow-hidden`: it clips the same without becoming a scroll container,
    // so the sidebar stays fixed while the page scrolls (Design/README.md "Fixed 224px sidebar").
    <div style={style} className="relative flex min-h-full overflow-clip bg-background">
      <div
        className="flex min-w-0 flex-1 transition-[padding-right] duration-[var(--duration-panel)] ease-[var(--easing-panel)]"
        style={panelOpen && panelBehavior === 'shift' ? { paddingRight: 'var(--drawer-width)' } : undefined}
      >
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-(--topbar-height) flex-none items-center gap-3 border-b border-border bg-card px-(--page-padding)">
            {breadcrumb}
            <div className="ml-auto flex items-center gap-2">{topbarRight}</div>
          </header>
          <main className="flex flex-col gap-5 overflow-x-auto p-(--page-padding)">{children}</main>
        </div>
        {panelBehavior === 'shift' && panel ? (
          <div className="fixed inset-y-0 right-0 w-(--drawer-width) border-l border-border bg-card p-5">{panel}</div>
        ) : null}
      </div>
      {panelBehavior === 'overlay' && panel ? (
        // `modal={false}` (row 5): a non-modal overlay that never dims or blocks the region
        // behind it — Radix's own setting for that, not a bespoke rewrite.
        <Sheet open={panelOpen} modal={false}>
          <SheetContent side="right">{panel}</SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
