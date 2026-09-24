import { ChevronDown, ArrowRight } from 'lucide-react';
import type { CSSProperties, JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/utils';
import { SCOPE_CONSEQUENCES } from '@/lib/scopes';

export interface UserMenuProps {
  name: string;
  email?: string;
  tenant?: string;
  provider?: string;
  scopes?: string[];
  missingScopes?: string[];
  objectId?: string;
  onSignOut?: () => void;
  style?: CSSProperties;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Ported from Design/components/shell/UserMenu.jsx, restyled onto shadcn/Tailwind classes.
 * `provider` defaults to "Microsoft Entra ID" so the menu always names the provider in full
 * (DRK-1669 §3).
 *
 * A native `<details>`/`<summary>` disclosure, not shadcn's `DropdownMenu` — a recorded
 * exception to R1/R2 (DRK-1681 ruling, round 2): it opens on the very first click, before
 * any client bundle has hydrated. Radix replays nothing lost to that race, in production as
 * much as in a `next dev` acceptance run — a `<details>` element needs no JS to open at all.
 * Keep this comment: it is the reason this one control isn't Radix, and it is what stops the
 * next pass from re-litigating that swap. `UserMenu.test.tsx` pins the element as native.
 */
export function UserMenu({
  name,
  email,
  tenant,
  provider = 'Microsoft Entra ID',
  scopes = [],
  missingScopes = [],
  objectId,
  style,
}: UserMenuProps): JSX.Element {
  return (
    <details style={style} className="relative">
      <summary
        role="button"
        aria-label="Account menu"
        className="flex max-w-55 list-none items-center gap-2 rounded-md p-1 pr-2 text-[length:var(--text-table-size)] font-[inherit] text-foreground [&::-webkit-details-marker]:hidden [&::marker]:hidden"
      >
        <span
          aria-hidden="true"
          className="flex h-6.5 w-6.5 flex-none items-center justify-center rounded-md bg-muted font-mono text-[length:var(--text-label-size)] font-semibold text-muted-foreground"
        >
          {initialsOf(name)}
        </span>
        <span className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap">{name}</span>
        <ChevronDown size={14} className="flex-none text-muted-foreground" />
      </summary>

      <div
        role="menu"
        className="absolute top-[calc(100%+var(--space-2))] right-0 z-40 w-72 rounded-lg border border-border bg-popover p-4 text-left text-popover-foreground shadow-overlay"
      >
        <div className="text-[length:var(--text-label-size)] font-semibold tracking-[var(--tracking-label)] text-muted-foreground uppercase">
          Signed in
        </div>
        <div className="mt-1 text-[length:var(--text-table-size)] font-semibold">{name}</div>
        <div className="text-[length:var(--text-caption-size)] text-muted-foreground">
          <span className="font-mono">{email}</span>
        </div>
        <div className="mt-1.5 text-[length:var(--text-caption-size)] text-muted-foreground">{provider}</div>

        <div role="separator" aria-orientation="horizontal" className="my-4 h-px w-full bg-border" />

        <div className="text-[length:var(--text-label-size)] font-semibold tracking-[var(--tracking-label)] text-muted-foreground uppercase">
          Directory
        </div>
        <div className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-[length:var(--text-caption-size)]">
          <span className="text-muted-foreground">Tenant</span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {tenant || <span className="text-muted-foreground">Not stated.</span>}
          </span>
          {objectId ? (
            <>
              <span className="text-muted-foreground">Object ID</span>
              <span className="overflow-hidden font-mono text-ellipsis whitespace-nowrap">{objectId}</span>
            </>
          ) : null}
        </div>

        <div role="separator" aria-orientation="horizontal" className="my-4 h-px w-full bg-border" />

        <div className="text-[length:var(--text-label-size)] font-semibold tracking-[var(--tracking-label)] text-muted-foreground uppercase">
          Scopes on this token
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {scopes.map((s) => (
            <Badge key={s} variant="selected" className="font-mono">
              {s}
            </Badge>
          ))}
          {missingScopes.map((s) => (
            <Badge key={s} variant="disabled" className="font-mono">
              {s}
            </Badge>
          ))}
        </div>
        {missingScopes.length ? (
          <div className="mt-2 text-[length:var(--text-caption-size)] text-muted-foreground">
            {missingScopes.map((s) => (
              <div key={s}>You cannot {SCOPE_CONSEQUENCES[s] ?? 'do this'} without this permission.</div>
            ))}
          </div>
        ) : null}

        <div role="separator" aria-orientation="horizontal" className="my-4 h-px w-full bg-border" />

        <form action="/signout" method="post">
          <button
            type="submit"
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md border border-border-control bg-card px-3 py-1 text-[length:var(--text-caption-size)] font-semibold text-foreground',
            )}
          >
            <ArrowRight size={14} />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
