import React from 'react';

/**
 * The console frame: sidebar, top bar, scrolling body, and a detail-panel slot.
 * The panel slides in over the right edge of the content by default. Pass
 * panelBehavior="shift" for the older behaviour, where the content is pushed left
 * by --drawer-width instead of being covered.
 */
export function AppShell({ sidebar, breadcrumb, topbarRight, panel, panelOpen = false, panelBehavior = 'overlay', children, style, ...rest }) {
  return (
    <div style={{ display: 'flex', minHeight: '100%', position: 'relative', overflow: 'hidden', background: 'var(--background)', ...style }} {...rest}>
      <div style={{
        display: 'flex', flex: 1, minWidth: 0,
        paddingRight: panelOpen && panelBehavior === 'shift' ? 'var(--drawer-width)' : 0,
        transition: 'padding-right var(--duration-panel) var(--easing-panel)'
      }}>
        {sidebar}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header style={{
            height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center',
            gap: 'var(--space-3)', padding: '0 var(--page-padding)',
            borderBottom: '1px solid var(--border)', background: 'var(--card)'
          }}>
            {breadcrumb}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{topbarRight}</div>
          </header>
          <main style={{ padding: 'var(--page-padding)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', overflowX: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
      {panel}
    </div>
  );
}
