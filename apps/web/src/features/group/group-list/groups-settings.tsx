import { LogIn, Plus, Users } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { useSwitchGroup } from '@/features/workspace/hooks/use-switch-group';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { GroupRow } from './group-row';

/** The groups you belong to, with switching, joining by code, and starting a new one. */
export function GroupsSettings() {
  const { activeOrganization, organizations } = useWorkspace();
  const { openDialog } = useWorkspaceDialogs();
  const switchGroup = useSwitchGroup();

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Each group has its own trips and people. Pick the one you are planning with."
        icon={Users}
        title="Groups"
      />
      <div className="space-y-4">
        <List bleed={false} data-testid={testIds.settingsGroups}>
          <List.Body>
            <List.Group aria-label="Groups">
              {organizations.map((organization) => (
                <GroupRow
                  current={organization.id === activeOrganization.id}
                  key={organization.id}
                  logo={organization.logo}
                  name={organization.name}
                  onSwitch={() => void switchGroup(organization.id, { goHome: false })}
                />
              ))}
            </List.Group>
          </List.Body>
        </List>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid={testIds.settingsGroupJoin}
            onClick={() => openDialog('join')}
            size="sm"
            type="button"
            variant="outline"
          >
            <LogIn />
            Join with code
          </Button>
          <Button
            data-testid={testIds.settingsGroupNew}
            onClick={() => openDialog('create-organization')}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus />
            New group
          </Button>
        </div>
      </div>
    </SettingsPanel>
  );
}
