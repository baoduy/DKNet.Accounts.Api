import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { JSX, ReactNode } from 'react';
import './globals.css';

/* next/font/google self-hosts at build time — no run-time request to a third party (R10),
   satisfying "the console draws its typefaces itself" (DRK-1669 §5). */
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'DKNet Accounts Console',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
