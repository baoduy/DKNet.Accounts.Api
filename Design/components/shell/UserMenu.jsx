import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';
import { Chip } from '../core/Chip.jsx';
import { Label, Caption, Note, Mono } from '../core/Label.jsx';
import { Separator } from '../core/Separator.jsx';

/** Initials from a display name. Two letters, upper case, no punctuation. */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * The signed-in identity in the top bar. The console authenticates against
 * Microsoft Entra ID, so the menu states the provider, the tenant and the scopes
 * the token actually carries — a refused action is explained by a missing scope,
 * and this is where the operator checks which ones they hold.
 */
export function UserMenu({
  name, email, tenant, provider = 'Microsoft Entra ID',
  scopes = [], missingScopes = [], objectId,
  onSignOut, style, ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const wrap = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={wrap} style={{ position: 'relative', ...style }} {...rest}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: '4px var(--space-2) 4px 4px', border: 0, borderRadius: 'var(--radius-md)',
          background: open || hover ? 'var(--surface-hover)' : 'transparent',
          font: 'inherit', fontSize: 'var(--text-table-size)', color: 'var(--foreground)',
          cursor: 'pointer', maxWidth: 220
        }}
      >
        <span aria-hidden="true" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, flex: 'none', borderRadius: 'var(--radius-md)',
          background: 'var(--muted)', color: 'var(--muted-foreground)',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-label-size)',
          fontWeight: 'var(--weight-semibold)'
        }}>{initialsOf(name)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'var(--weight-semibold)' }}>{name}</span>
        <Icon name="chevron-down" size={14} style={{ flex: 'none', color: 'var(--muted-foreground)' }} />
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 288, zIndex: 40,
            background: 'var(--popover)', color: 'var(--popover-foreground)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-overlay)', padding: 'var(--card-padding)',
            textAlign: 'left'
          }}
        >
          <Label>Signed in</Label>
          <div style={{ marginTop: 4, fontSize: 'var(--text-table-size)', fontWeight: 'var(--weight-semibold)' }}>{name}</div>
          <div><Caption><Mono style={{ fontSize: 'var(--text-caption-size)' }}>{email}</Mono></Caption></div>
          <Note style={{ marginTop: 6 }}>{provider}</Note>

          <Separator style={{ margin: 'var(--space-4) 0' }} />

          <Label>Directory</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '4px var(--space-3)', marginTop: 'var(--space-2)', fontSize: 'var(--text-caption-size)' }}>
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
            {scopes.map((s) => <Chip key={s} selected><Mono style={{ fontSize: 'var(--text-label-size)' }}>{s}</Mono></Chip>)}
            {missingScopes.map((s) => <Chip key={s} style={{ background: 'var(--surface-disabled)', color: 'var(--text-disabled)', textDecoration: 'line-through' }}><Mono style={{ fontSize: 'var(--text-label-size)' }}>{s}</Mono></Chip>)}
          </div>
          {missingScopes.length ? (
            <Note style={{ marginTop: 'var(--space-2)' }}>
              {missingScopes.length === 1 ? missingScopes[0] + ' is not granted' : missingScopes.join(', ') + ' are not granted'}. Actions that need it stay on screen, disabled, with the reason beside them.
            </Note>
          ) : null}

          <Separator style={{ margin: 'var(--space-4) 0' }} />

          <Button size="sm" icon={<Icon name="arrow-right" size={14} />} onClick={onSignOut} style={{ width: '100%', justifyContent: 'center' }}>Sign out</Button>
        </div>
      ) : null}
    </div>
  );
}
