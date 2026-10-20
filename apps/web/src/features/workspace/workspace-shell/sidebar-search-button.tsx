import { Search } from '@groam/icons';
import { Kbd } from '@groam/ui/components/kbd';
import { SidebarMenuButton } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useCommandPaletteChrome } from '@/features/workspace/hooks/command-palette-chrome';
import { modifierKeyLabel } from '@/features/workspace/workspace-command/shortcut-label';
import { testIds } from '@/lib/test-ids';

/** Outline sidebar trigger for the ⌘K command palette. */
export function SidebarSearchButton() {
  const { setOpenMobile } = useSidebar();
  const onOpenChange = useCommandPaletteChrome((state) => state.onOpenChange);
  const shortcut = `${modifierKeyLabel()}K`;

  return (
    <SidebarMenuButton
      aria-keyshortcuts="Meta+K Control+K"
      className="h-9 rounded-lg border border-sidebar-border bg-sidebar px-2.5 text-muted-foreground shadow-xs transition-[color,border-color,box-shadow] hover:border-sidebar-ring/40 hover:bg-sidebar hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      data-testid={testIds.commandPaletteTrigger}
      onClick={() => {
        setOpenMobile(false);
        onOpenChange(true);
      }}
      tooltip={`Search (${shortcut})`}
    >
      <Search />
      <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Search</span>
      <Kbd className="bg-sidebar-accent/60 group-data-[collapsible=icon]:hidden">{shortcut}</Kbd>
    </SidebarMenuButton>
  );
}
