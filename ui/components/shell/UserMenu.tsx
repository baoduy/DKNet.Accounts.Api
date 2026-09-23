import { ChevronDown, ArrowRight } from 'lucide-react';
import type { CSSProperties, JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
 * Ported from Design/components/shell/UserMenu.jsx onto shadcn's `DropdownMenu`. `provider`
 * defaults to "Microsoft Entra ID" so the menu always names the provider in full (DRK-1669 §3).
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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        style={style}
        className="flex max-w-55 items-center gap-2 rounded-md p-1 pr-2 text-[length:var(--text-table-size)] text-foreground"
      >
        <span
          aria-hidden="true"
          className="flex h-6.5 w-6.5 flex-none items-center justify-center rounded-md bg-muted font-mono text-[length:var(--text-label-size)] font-semibold text-muted-foreground"
        >
          {initialsOf(name)}
        </span>
        <span className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap">{name}</span>
        <ChevronDown size={14} className="flex-none text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="mt-1 text-[length:var(--text-table-size)] font-semibold">{name}</div>
        <div className="text-[length:var(--text-caption-size)] text-muted-foreground">
          <span className="font-mono">{email}</span>
        </div>
        <div className="mt-1.5 text-[length:var(--text-caption-size)] text-muted-foreground">{provider}</div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Directory</DropdownMenuLabel>
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

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Scopes on this token</DropdownMenuLabel>
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
              <div key={s}>Mai cannot {SCOPE_CONSEQUENCES[s] ?? 'do this'} without this permission.</div>
            ))}
          </div>
        ) : null}

        <DropdownMenuSeparator />

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
