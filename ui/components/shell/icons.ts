import { ArrowLeftRight, Coins, Folder, LayoutDashboard, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** The console's kebab-case icon names (Design/components/core/Icon.jsx's naming) mapped onto their lucide-react component. */
export const CONSOLE_ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  folder: Folder,
  wallet: Wallet,
  'arrow-left-right': ArrowLeftRight,
  coins: Coins,
};
