import type { CSSProperties, ReactNode } from 'react';

/** The 24px page title with its 20px Lucide glyph, the meta row beneath it, and right-aligned actions. */
export interface PageHeaderProps {
  /** Lucide glyph name — the same one the sidebar uses for this screen. */
  icon?: string;
  title: ReactNode;
  /** Identifiers, chips and status badges on one line under the title. */
  meta?: ReactNode;
  /** A one-line explanation of what the screen is for. */
  description?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}
export declare function PageHeader(props: PageHeaderProps): JSX.Element;
