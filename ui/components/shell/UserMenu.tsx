import type { CSSProperties, JSX } from 'react';
import { Caption, Chip, Icon, Label, Mono, Note, Separator } from '@/components/core';
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
 * Ported from Design/components/shell/UserMenu.jsx. `provider` defaults to
 * "Microsoft Entra ID" so the menu always names the provider in full (DRK-1669 §3).
 *
 * A native `<details>`/`<summary>` disclosure, not React state: it opens on the very first
 * click, before any client bundle has hydrated — a dropdown built on `useState` stays
 * unresponsive to the operator's first click until hydration catches up.
 */
export function UserMenu({ name, email, tenant, provider = 'Microsoft Entra ID', scopes = [], missingScopes = [], objectId, style }: UserMenuProps): JSX.Element {
  return (
    <details style={{ position: 'relative', ...style }}>
      <summary
        role="button"
        aria-label="Account menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '4px var(--space-2) 4px 4px',
          borderRadius: 'var(--radius-md)',
          font: 'inherit',
          fontSize: 'var(--text-table-size)',
          color: 'var(--foreground)',
          cursor: 'pointer',
          maxWidth: 220,
          listStyle: 'none',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            flex: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-label-size)',
            fontWeight: 'var(--weight-semibold)',
          }}
        >
          {initialsOf(name)}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'var(--weight-semibold)' }}>{name}</span>
        <Icon name="chevron-down" size={14} style={{ flex: 'none', color: 'var(--muted-foreground)' }} />
      </summary>

      <div
        role="menu"
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: 288,
          zIndex: 40,
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-overlay)',
          padding: 'var(--card-padding)',
          textAlign: 'left',
        }}
      >
        <Label>Signed in</Label>
        <div style={{ marginTop: 4, fontSize: 'var(--text-table-size)', fontWeight: 'var(--weight-semibold)' }}>{name}</div>
        <div>
          <Caption>
            <Mono style={{ fontSize: 'var(--text-caption-size)' }}>{email}</Mono>
          </Caption>
        </div>
        <Note style={{ marginTop: 6 }}>{provider}</Note>

        <Separator style={{ margin: 'var(--space-4) 0' }} />

        <Label>Directory</Label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content minmax(0, 1fr)',
            gap: '4px var(--space-3)',
            marginTop: 'var(--space-2)',
            fontSize: 'var(--text-caption-size)',
          }}
        >
          <Caption>Tenant</Caption>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant || <Caption>Not stated.</Caption>}</span>
          {objectId ? (
            <>
              <Caption>Object ID</Caption>
              <Mono style={{ fontSize: 'var(--text-caption-size)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objectId}</Mono>
            </>
          ) : null}
        </div>

        <Separator style={{ margin: 'var(--space-4) 0' }} />

        <Label>Scopes on this token</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {scopes.map((s) => (
            <Chip key={s} selected>
              <Mono style={{ fontSize: 'var(--text-label-size)' }}>{s}</Mono>
            </Chip>
          ))}
          {missingScopes.map((s) => (
            <Chip key={s} style={{ background: 'var(--surface-disabled)', color: 'var(--text-disabled)', textDecoration: 'line-through' }}>
              <Mono style={{ fontSize: 'var(--text-label-size)' }}>{s}</Mono>
            </Chip>
          ))}
        </div>
        {missingScopes.length ? (
          <Note style={{ marginTop: 'var(--space-2)' }}>
            {missingScopes.map((s) => (
              <div key={s}>Mai cannot {SCOPE_CONSEQUENCES[s] ?? 'do this'} without this permission.</div>
            ))}
          </Note>
        ) : null}

        <Separator style={{ margin: 'var(--space-4) 0' }} />

        <form action="/signout" method="post">
          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-caption-size)',
              fontWeight: 'var(--weight-semibold)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-control)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            <Icon name="arrow-right" size={14} />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
