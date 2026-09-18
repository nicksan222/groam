import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { initials } from '@groam/ui/lib/avatar';
import { KeyRound } from 'lucide-react';
import { useEffect } from 'react';
import { GroupPeopleSettings } from '@/features/group/group-people/group-people-settings';
import { useAiAvailability } from '@/features/settings/hooks/use-ai-availability';
import { AiSettings } from '@/features/settings/settings-panels/ai-settings';
import { AppearanceSettings } from '@/features/settings/settings-panels/appearance-settings';
import { DataSettings } from '@/features/settings/settings-panels/data-settings';
import { OrganizationSettings } from '@/features/settings/settings-panels/organization-settings';
import { ProfileSettings } from '@/features/settings/settings-panels/profile-settings';
import { SecuritySettings } from '@/features/settings/settings-panels/security-settings';
import { SettingsStack } from '@/features/settings/settings-shell/settings-panel';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { SettingsSectionNav } from './settings-section-nav';
import type { SettingsSection } from './settings-sections';

export type { SettingsSection };

const sectionCopy: Record<SettingsSection, { description: string; title: string }> = {
  ai: {
    description: 'Choose a personal AI connection or manage the organization fallback.',
    title: 'AI'
  },
  appearance: {
    description: 'Choose how Groam looks on this device. Your selection is saved automatically.',
    title: 'Appearance'
  },
  data: {
    description: 'Export or restore the local database this app keeps on this computer.',
    title: 'Data'
  },
  group: {
    description: 'Manage who belongs here and how this group appears.',
    title: 'Group'
  },
  profile: {
    description: 'Choose how your name and photo appear to everyone you travel with.',
    title: 'Profile'
  },
  security: {
    description: 'Keep your account secure and control how you sign in.',
    title: 'Security'
  }
};

export function SettingsView({
  activeSection,
  onSectionChange
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  const { activeOrganization, activeRole, session } = useWorkspace();
  const { openDialog } = useWorkspaceDialogs();
  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const { environmentConfigured, hideAi } = useAiAvailability();
  const copy = sectionCopy[activeSection];

  useEffect(() => {
    if (environmentConfigured && activeSection === 'ai') onSectionChange('profile');
  }, [activeSection, environmentConfigured, onSectionChange]);

  useSetAgentContext({
    capabilities: [],
    data: {
      activeSection,
      canManageGroup: canManage,
      groupName: activeOrganization.name,
      groupRole: activeRole,
      profileName: session.user.name
    },
    description: `Explain the visible ${activeSection} settings without changing account or security data.`,
    key: `settings:${activeSection}`,
    title: `Settings · ${copy.title}`
  });

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Banner>
          <Shell.BannerHeading
            actions={
              activeSection === 'group' ? (
                <Button
                  data-testid={testIds.inviteMember}
                  onClick={() => openDialog('invite')}
                  size="sm"
                  variant="outline"
                >
                  <KeyRound />
                  <span className="max-sm:sr-only">Create code</span>
                </Button>
              ) : (
                <SettingsHeaderAvatar user={session.user} />
              )
            }
            description={copy.description}
            title="Settings"
            titleTestId={testIds.settingsTitle}
          />
          <SettingsSectionNav
            activeSection={activeSection}
            hideAi={hideAi}
            onSectionChange={onSectionChange}
          />
        </Shell.Banner>

        <Shell.PageBody variant="compact">
          <div className="min-w-0" key={activeSection}>
            {activeSection === 'profile' && <ProfileSettings user={session.user} />}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'group' && (
              <SettingsStack>
                <OrganizationSettings
                  canManage={canManage}
                  isOwner={activeRole === 'owner'}
                  key={activeOrganization.id}
                  organization={activeOrganization}
                />
                <GroupPeopleSettings />
              </SettingsStack>
            )}
            {activeSection === 'security' && <SecuritySettings session={session} />}
            {activeSection === 'ai' && !hideAi && <AiSettings key={activeOrganization.id} />}
            {activeSection === 'data' && <DataSettings />}
          </div>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}

function SettingsHeaderAvatar({
  user
}: {
  user: { email: string; image?: null | string; name: string };
}) {
  return (
    <div className="hidden shrink-0 items-center gap-3 sm:flex">
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Avatar className="size-10 border border-border">
        <AvatarImage alt={user.name} src={user.image ?? ''} />
        <AvatarFallback className="text-sm font-semibold">{initials(user.name)}</AvatarFallback>
      </Avatar>
    </div>
  );
}
