import { LogIn, Plus, Settings } from '@groam/icons';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@groam/ui/components/dropdown-menu';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useSwitchGroup } from '@/features/workspace/hooks/use-switch-group';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import { GroupAvatar } from './group-avatar';
import { roleLabel } from './role-label';

/**
 * The group, with the viewer's role, at the bottom of the trip switcher: the other groups to switch to, then joining
 * a group with a code, starting a new one, and the group's settings. Shown with or without a trip.
 */
export function TripSwitcherGroupMenu() {
  const { setOpenMobile } = useSidebar();
  const { activeOrganization, activeRole, organizations } = useWorkspace();
  const openDialog = useWorkspaceDialogs((state) => state.openDialog);
  const navigate = useNavigate();
  const switchGroup = useSwitchGroup();
  const others = organizations.filter((organization) => organization.id !== activeOrganization.id);

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className="gap-3"
          data-group-name={activeOrganization.name}
          data-testid={testIds.groupSwitcher}
        >
          <GroupAvatar logo={activeOrganization.logo} name={activeOrganization.name} />
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate font-medium">{activeOrganization.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              Group · {roleLabel(activeRole)}
            </span>
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64">
          {others.length > 0 ? (
            <>
              <DropdownMenuLabel>Switch group</DropdownMenuLabel>
              {others.map((organization) => (
                <DropdownMenuItem
                  data-group-name={organization.name}
                  data-testid={testIds.groupSwitcherItem}
                  key={organization.id}
                  onSelect={() => {
                    setOpenMobile(false);
                    void switchGroup(organization.id);
                  }}
                >
                  <GroupAvatar logo={organization.logo} name={organization.name} />
                  <span className="truncate">{organization.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            data-testid={testIds.groupSwitcherJoin}
            onSelect={() => {
              setOpenMobile(false);
              openDialog('join');
            }}
          >
            <LogIn /> Join with code
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid={testIds.groupSwitcherNew}
            onSelect={() => {
              setOpenMobile(false);
              openDialog('create-organization');
            }}
          >
            <Plus /> New group
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid={testIds.groupSwitcherSettings}
            onSelect={() => {
              setOpenMobile(false);
              void navigate({ params: { section: 'group' }, to: '/settings/$section' });
            }}
          >
            <Settings /> Group settings
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
