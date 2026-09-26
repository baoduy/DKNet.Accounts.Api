import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** The type roles `app/globals.css` maps into `@theme`: without them `text-caption` would merge away as a colour. */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['page-title', 'section', 'panel-title', 'body', 'table', 'caption', 'label', 'amount', 'tile-amount'] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
