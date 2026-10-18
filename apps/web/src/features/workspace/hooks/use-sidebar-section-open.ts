import { type SidebarSectionKey, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
/** Recent items open only when the traveler asks; navigation preserves their choice. */
export function useSidebarSectionOpen(section: SidebarSectionKey) {
  const open = useSidebarChromeStore((state) => state.isSectionOpen(section));
  const setSectionOpen = useSidebarChromeStore((state) => state.setSectionOpen);
  return [open, (nextOpen: boolean) => setSectionOpen(section, nextOpen)] as const;
}
