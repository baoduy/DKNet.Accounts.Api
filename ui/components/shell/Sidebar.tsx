import type { CSSProperties, JSX } from 'react';

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

export function Sidebar(props: SidebarProps): JSX.Element {
  throw new Error('Not implemented');
}
