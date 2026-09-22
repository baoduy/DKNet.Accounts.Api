import type { CSSProperties } from 'react';

export interface NavEntry { id: string; label: string; icon: string; href?: string }
export interface NavSection { title: string; items: NavEntry[]; pinToBottom?: boolean }

/** The console's own navigation: LEDGER at the top, ADMINISTRATION pinned to the foot. */
export declare const CONSOLE_NAV: NavSection[];

/**
 * A fixed 208px left sidebar, two sections, one navigation tree. There is no
 * "Transactions" entry: the API exposes no route that lists postings across accounts,
 * so a link promising one would lead to a screen that cannot be built.
 */
export interface SidebarProps {
  brand?: string;
  sections?: NavSection[];
  /** The active entry's `id`. */
  active?: string;
  onNavigate?: (item: NavEntry) => void;
  style?: CSSProperties;
}
export declare function Sidebar(props: SidebarProps): JSX.Element;
