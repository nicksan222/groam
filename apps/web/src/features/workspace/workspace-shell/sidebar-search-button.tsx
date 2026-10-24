import { Search } from '@groam/icons';
import { Kbd } from '@groam/ui/components/kbd';
import { SidebarMenuButton } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useCommandPaletteChrome } from '@/features/workspace/hooks/command-palette-chrome';
import { modifierKeyLabel } from '@/features/workspace/workspace-command/shortcut-label';
import { testIds } from '@/lib/test-ids';

/** The sidebar's search field under the trip: an input-shaped trigger for the ⌘K command palette. */
export function SidebarSearchButton() {
  const { setOpenMobile } = useSidebar();
  const onOpenChange = useCommandPaletteChrome((state) => state.onOpenChange);
  const modifier = modifierKeyLabel();
  const shortcut = `${modifier}K`;

  return (
    <SidebarMenuButton
      aria-keyshortcuts="Meta+K Control+K"
      className="h-8 gap-2 border border-sidebar-border bg-background/70 px-2 text-sidebar-foreground shadow-xs hover:border-sidebar-ring/30 hover:bg-background hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:shadow-none"
      data-testid={testIds.commandPaletteTrigger}
      onClick={() => {
        setOpenMobile(false);
        onOpenChange(true);
      }}
      tooltip={`Search (${shortcut})`}
    >
      <Search />
      <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Search</span>
      <Kbd className="border-sidebar-border bg-sidebar font-sans max-md:hidden group-data-[collapsible=icon]:hidden">
        {modifier}
        <span>K</span>
      </Kbd>
    </SidebarMenuButton>
  );
}
