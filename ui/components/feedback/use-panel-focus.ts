'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * DRK-1725 §3 row 8 — a side panel takes focus when it opens, so the keyboard is where the new
 * content is, and gives it back to the control that opened it when it closes. It traps nothing:
 * the panel is inline and Tab carries on past it through the page (R3). Put the ref on the
 * panel's container, with `tabIndex={-1}` so it can hold focus without becoming a tab stop.
 */
export function usePanelFocus<T extends HTMLElement>(open: boolean): RefObject<T | null> {
  const panelRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });
    return () => {
      // Only focus the panel took with it — never pulled away from where the operator moved on to.
      const active = document.activeElement;
      const lost = active === document.body || (panel?.contains(active) ?? false);
      if (lost && opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return panelRef;
}
