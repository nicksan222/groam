import { LayoutDashboard, Settings } from '@groam/icons';
import { testIds } from '@/lib/test-ids';
import type { SidebarNavItem } from '@/types/workspace';

export const homeNavigation = {
  icon: LayoutDashboard,
  label: 'Home',
  testId: testIds.navHome,
  to: '/'
} satisfies SidebarNavItem;

export const settingsNavigation = {
  icon: Settings,
  label: 'Settings',
  testId: testIds.navSettings,
  to: '/settings'
} satisfies SidebarNavItem;

export function navigationItemIsActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

const pageTitles: Array<[prefix: string, title: string]> = [
  ['/inbox', 'Inbox'],
  ['/settings', 'Settings'],
  ['/chat', 'Chat'],
  ['/trips', 'Trips']
];

/** The title the phone top bar shows off a trip: the area the path belongs to. */
export function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Home';
  return pageTitles.find(([prefix]) => navigationItemIsActive(pathname, prefix))?.[1] ?? 'Groam';
}
