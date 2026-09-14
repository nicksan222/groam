import { FileDiff, LayoutDashboard, Map as MapIcon, MessageSquare, Settings } from 'lucide-react';
import type { SidebarNavItem } from '@/types/workspace';

export type { SidebarNavItem };

export const primaryNavigation = [{ icon: LayoutDashboard, label: 'Home', to: '/' }] as const;

export const manageNavigation = [{ icon: Settings, label: 'Settings', to: '/settings' }] as const;

export const mobileNavigation = [
  { icon: LayoutDashboard, label: 'Home', to: '/' },
  { icon: MapIcon, label: 'Trips', to: '/trips' },
  { icon: FileDiff, label: 'Ideas', to: '/ideas' },
  { icon: MessageSquare, label: 'Chat', to: '/chat' }
] as const;

export function navigationItemIsActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

export function isChatThreadRoute(pathname: string) {
  return /^\/chat\/[^/]+/.test(pathname);
}
