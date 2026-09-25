'use client';

import type { CSSProperties, JSX } from 'react';
import { CONSOLE_ICONS } from '@/components/shell/icons';
import { cn } from '@/components/ui/utils';

export interface NavEntry {
  id: string;
  label: string;
  icon: string;
  href?: string;
}

export interface NavSection {
  title: string;
  items: NavEntry[];
  pinToBottom?: boolean;
}

/** The console's own navigation: LEDGER at the top, ADMINISTRATION pinned to the foot. Ported from Design/components/shell/Sidebar.jsx. */
export const CONSOLE_NAV: NavSection[] = [
  {
    title: 'LEDGER',
    items: [
      { id: 'overview', label: 'Overview', icon: 'layout-dashboard', href: '/' },
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'records', label: 'Records', icon: 'file-text', href: '/records' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    pinToBottom: true,
    items: [
      { id: 'groups', label: 'Account groups', icon: 'folder', href: '/groups' },
      { id: 'currencies', label: 'Currencies', icon: 'coins', href: '/currencies' },
    ],
  },
];

export interface SidebarProps {
  sections?: NavSection[];
  active?: string;
  onNavigate?: (item: NavEntry) => void;
  style?: CSSProperties;
}

export function Sidebar({ sections = CONSOLE_NAV, active, onNavigate, style }: SidebarProps): JSX.Element {
  return (
    <nav
      style={style}
      // The height of the viewport, not of the page: ADMINISTRATION sits at the foot of the screen
      // whatever the content below holds, and never moves when a screen's data arrives (DRK-1725 R1).
      className="sticky top-0 flex h-dvh w-(--sidebar-width) flex-none flex-col self-start overflow-y-auto border-r border-sidebar-border bg-sidebar p-2 text-sidebar-foreground"
    >
      <div className="px-2 pt-1 pb-2.5 text-[length:var(--text-panel-title-size)] font-extrabold tracking-[var(--tracking-title)]">
        Accounts
      </div>
      {sections.map((section) => (
        <div key={section.title} className={section.pinToBottom ? 'mt-auto' : undefined}>
          <div className="px-2 pt-3.5 pb-1 text-[length:var(--text-label-size)] font-semibold tracking-[var(--tracking-section-label)] text-muted-foreground">
            {section.title}
          </div>
          {section.items.map((item) => (
            <NavItem key={item.id} item={item} active={active === item.id} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavItem({ item, active, onNavigate }: { item: NavEntry; active: boolean; onNavigate?: (item: NavEntry) => void }): JSX.Element {
  const IconComponent = CONSOLE_ICONS[item.icon];
  return (
    <a
      href={item.href ?? '#'}
      aria-current={active ? 'page' : undefined}
      onClick={
        onNavigate
          ? (event) => {
              event.preventDefault();
              onNavigate(item);
            }
          : undefined
      }
      className={cn(
        'flex items-center gap-2 rounded-md p-2 text-[length:var(--text-table-size)] no-underline',
        active ? 'bg-surface-selected font-semibold text-foreground' : 'font-normal text-foreground hover:bg-muted',
      )}
    >
      {IconComponent ? <IconComponent size={16} /> : null}
      {item.label}
    </a>
  );
}
