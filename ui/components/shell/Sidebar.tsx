'use client';

import { useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { Icon } from '@/components/core';

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
      { id: 'groups', label: 'Account groups', icon: 'folder', href: '/groups' },
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'record', label: 'Record posting', icon: 'arrow-left-right', href: '/postings/new' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    pinToBottom: true,
    items: [{ id: 'currencies', label: 'Currencies', icon: 'coins', href: '/currencies' }],
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
      style={{
        width: 'var(--sidebar-width)',
        flex: 'none',
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        padding: 'var(--space-3) var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ fontSize: 'var(--text-panel-title-size)', fontWeight: 'var(--weight-extrabold)', letterSpacing: 'var(--tracking-title)', padding: '4px 8px 10px' }}>
        Accounts
      </div>
      {sections.map((section) => (
        <div key={section.title} style={section.pinToBottom ? { marginTop: 'auto' } : undefined}>
          <div
            style={{
              fontSize: 'var(--text-label-size)',
              fontWeight: 'var(--weight-semibold)',
              letterSpacing: 'var(--tracking-section-label)',
              color: 'var(--muted-foreground)',
              padding: '14px 8px 4px',
            }}
          >
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
  const [hover, setHover] = useState(false);
  return (
    <a
      href={item.href ?? '#'}
      onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(item); } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        fontSize: 'var(--text-table-size)',
        color: 'var(--foreground)',
        fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        background: active ? 'var(--surface-selected)' : hover ? 'var(--muted)' : 'transparent',
      }}
    >
      <Icon name={item.icon} size={16} />
      {item.label}
    </a>
  );
}
