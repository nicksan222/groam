import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@groam/ui/components/collapsible';
import { SidebarMenuAction, SidebarMenuItem, SidebarMenuSub } from '@groam/ui/components/sidebar';
import {
  SIDEBAR_NESTED_LIST_CLASS,
  sidebarSectionToggleLabel
} from '@groam/ui/lib/sidebar-collapsible';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type SidebarCollapsibleItemProps = {
  children: ReactNode;
  label: string;
  nestedListClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trigger: ReactNode;
};

function SidebarCollapsibleItem({
  children,
  label,
  nestedListClassName = SIDEBAR_NESTED_LIST_CLASS,
  onOpenChange,
  open,
  trigger
}: SidebarCollapsibleItemProps) {
  const toggleLabel = sidebarSectionToggleLabel(label, open);

  return (
    <Collapsible asChild className="group/collapsible" onOpenChange={onOpenChange} open={open}>
      <SidebarMenuItem>
        {trigger}
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            aria-expanded={open}
            aria-label={toggleLabel}
            showOnHover={open}
            title={toggleLabel}
          >
            <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className={nestedListClassName}>{children}</SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export { SidebarCollapsibleItem };
