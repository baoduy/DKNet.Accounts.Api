import { Fragment } from 'react';
import type { CSSProperties, JSX } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  id?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Intercept navigation. The last item always renders as plain bold text. */
  onNavigate?: (item: BreadcrumbItem) => void;
  style?: CSSProperties;
}

/** The top-bar trail of every detail screen: `Groups / ACME / ACME-000123`. Ported from Design/components/core/Breadcrumb.jsx. */
export function Breadcrumb({ items, onNavigate, style }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" style={style} className="truncate text-[length:var(--text-table-size)] whitespace-nowrap text-muted-foreground">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <Fragment key={item.label + index}>
            {index > 0 ? (
              <span aria-hidden="true" className="px-1.5">
                /
              </span>
            ) : null}
            {last || (!item.href && !onNavigate) ? (
              <b aria-current={last ? 'page' : undefined} className="font-semibold text-foreground">
                {item.label}
              </b>
            ) : (
              <a
                href={item.href ?? '#'}
                className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                onClick={
                  onNavigate
                    ? (event) => {
                        event.preventDefault();
                        onNavigate(item);
                      }
                    : undefined
                }
              >
                {item.label}
              </a>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
