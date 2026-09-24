import type { CSSProperties } from 'react';

export interface BreadcrumbItem { label: string; href?: string; id?: string }

/** Sits in the top bar of every detail screen: `Groups / ACME / ACME-000123 / Statement`. */
export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Intercept navigation in a prototype. The last item always renders as plain bold text. */
  onNavigate?: (item: BreadcrumbItem) => void;
  style?: CSSProperties;
}
export declare function Breadcrumb(props: BreadcrumbProps): JSX.Element;
