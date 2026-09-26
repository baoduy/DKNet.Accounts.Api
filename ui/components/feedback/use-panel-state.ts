/**
 * DRK-1760 §3 row 7 — the side panel's state, one implementation for every screen: what the panel
 * shows (view, create or edit), whether its form holds unsent edits, and the guarded close that asks
 * before those edits are dropped. Which record is open lives in the page address (`useListViewState`).
 */
'use client';

import { createElement, Fragment, useCallback, useEffect, useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export type PanelMode = 'view' | 'create' | 'edit';

/** The discard step's wording: the record form keeps its own, since its idempotency key goes too. */
export interface DiscardCopy {
  title: string;
  text: string;
  discardLabel: string;
  /** The record form's discard sits apart, at the footer's far end. */
  discardClassName?: string;
}

export const DISCARD_CHANGES: DiscardCopy = {
  title: 'Discard unsaved changes?',
  text: 'This form has edits that have not been sent. Closing the panel drops them.',
  discardLabel: 'Discard changes',
};

export const DISCARD_RECORD: DiscardCopy = {
  title: 'Discard unsent record?',
  text: 'This record has not been sent. Closing the panel drops it, and the idempotency key is discarded with it.',
  discardLabel: 'Discard record',
  discardClassName: 'ml-auto',
};

export interface PanelStateOptions {
  initialMode?: PanelMode | null;
  copy?: DiscardCopy;
  /** A screen that drafts the form itself states whether it differs from where it started (only
   * create and edit mode hold a form); otherwise the mounted form reports it (`useReportDirty`). */
  dirty?: boolean;
}

export interface PanelState {
  mode: PanelMode | null;
  /** Switches what the panel shows; unsent edits go with the form they were made in. */
  show: (mode: PanelMode | null) => void;
  /** The form's own report of unsent edits — hand it to the form as `onDirtyChange`. */
  onDirtyChange: (dirty: boolean) => void;
  /** Runs `next` at once, or — while the panel's form holds unsent edits — once discarding is confirmed. */
  guard: (next: () => void) => void;
  /** The discard step; mount it once, anywhere on the screen. */
  dialog: JSX.Element;
}

export function usePanelState({ initialMode = null, copy = DISCARD_CHANGES, dirty: stated }: PanelStateOptions = {}): PanelState {
  const [mode, setMode] = useState<PanelMode | null>(initialMode);
  const [reported, setReported] = useState(false);
  const [then, setThen] = useState<(() => void) | null>(null);
  const onDirtyChange = useCallback((next: boolean) => setReported(next), []);
  const dirty = stated === undefined ? reported : stated && (mode === 'create' || mode === 'edit');

  const keep = (): void => setThen(null);
  const discard = (): void => {
    setThen(null);
    setReported(false);
    then?.();
  };

  return {
    mode,
    show: (next) => {
      setReported(false);
      setMode(next);
    },
    onDirtyChange,
    guard: (next) => (dirty ? setThen(() => next) : next()),
    dialog: createElement(
      Dialog,
      {
        open: then !== null,
        title: copy.title,
        onClose: keep,
        footer: createElement(
          Fragment,
          null,
          createElement(Button, { onClick: keep }, 'Keep editing'),
          createElement(Button, { variant: 'destructive', className: copy.discardClassName, onClick: discard }, copy.discardLabel),
        ),
      },
      copy.text,
    ),
  };
}

/** A form's report of whether it holds unsent edits, made whenever that changes — and, once the
 * form is gone (sent, discarded, or left by Back), that nothing is left to discard. */
export function useReportDirty(dirty: boolean, onDirtyChange: ((dirty: boolean) => void) | undefined): void {
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
}
