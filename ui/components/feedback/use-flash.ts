/**
 * DRK-1760 §3 row 8 — the success card every screen shows after a write went through, one
 * implementation: an `Acknowledgement` (a `status` live region) that stays until it is dismissed.
 */
'use client';

import { createElement, useState, type JSX, type ReactNode } from 'react';
import { Acknowledgement } from './Acknowledgement';

export interface Flash {
  title: string;
  text: ReactNode;
}

export interface FlashState {
  flash: Flash | null;
  show: (flash: Flash) => void;
  dismiss: () => void;
  /** The card, or `null` when there is nothing to acknowledge. */
  card: JSX.Element | null;
}

export function useFlash(): FlashState {
  const [flash, setFlash] = useState<Flash | null>(null);
  const dismiss = (): void => setFlash(null);
  return {
    flash,
    show: setFlash,
    dismiss,
    card: flash ? createElement(Acknowledgement, { title: flash.title, onDismiss: dismiss }, flash.text) : null,
  };
}
