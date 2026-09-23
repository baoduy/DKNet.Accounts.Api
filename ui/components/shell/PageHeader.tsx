import type { CSSProperties, JSX, ReactNode } from 'react';

export interface PageHeaderProps {
  icon?: string;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}

/** Ported from Design/components/shell/PageHeader.jsx. */
export function PageHeader(props: PageHeaderProps): JSX.Element {
  throw new Error('Not implemented');
}
