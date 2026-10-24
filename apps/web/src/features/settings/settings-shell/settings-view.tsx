import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import Shell from '@groam/ui/components/shell/client';
import { GroupsSettings } from '@/features/group/group-list/groups-settings';
import { GroupPeopleSettings } from '@/features/group/group-people/group-people-settings';
import { AiSettings } from '@/features/settings/settings-panels/ai-settings';
import { AppearanceSettings } from '@/features/settings/settings-panels/appearance-settings';
import { EmailSettings } from '@/features/settings/settings-panels/email-settings';
import { OrganizationSettings } from '@/features/settings/settings-panels/organization-settings';
import { ProfileSettings } from '@/features/settings/settings-panels/profile-settings';
import { SecuritySettings } from '@/features/settings/settings-panels/security-settings';
import { SettingsStack } from '@/features/settings/settings-shell/settings-panel';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { SettingsSectionNav } from './settings-section-nav';
import type { SettingsSection } from './settings-sections';

export type { SettingsSection };

const sectionCopy: Record<SettingsSection, { description: string; title: string }> = {
  ai: {
    description: 'Connect your personal ChatGPT account to use AI throughout Groam.',
    title: 'AI'
  },
  appearance: {
    description: 'Choose how Groam looks on this device. Your selection is saved automatically.',
    title: 'Appearance'
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
  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const copy = sectionCopy[activeSection];

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
        <Shell.Header
          meta={copy.description}
          title="Settings"
          titleProps={{ 'data-testid': testIds.settingsTitle }}
        />

        <Shell.PageBody>
          <div className="grid w-full items-start gap-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
            <SettingsSectionNav activeSection={activeSection} onSectionChange={onSectionChange} />
            <div
              className="relative -mt-6 min-w-0 lg:before:pointer-events-none lg:before:absolute lg:before:top-6 lg:before:bottom-0 lg:before:left-48 lg:before:w-px lg:before:bg-border lg:before:content-['']"
              key={activeSection}
            >
              {activeSection === 'profile' && (
                <SettingsStack>
                  <div className="border-b border-border py-6">
                    <ProfileSettings user={session.user} />
                  </div>
                  <EmailSettings email={session.user.email} />
                </SettingsStack>
              )}
              {activeSection === 'appearance' && <AppearanceSettings />}
              {activeSection === 'group' && (
                <SettingsStack>
                  <GroupsSettings />
                  <OrganizationSettings
                    canManage={canManage}
                    isOwner={activeRole === 'owner'}
                    key={activeOrganization.id}
                    organization={activeOrganization}
                  >
                    <GroupPeopleSettings />
                  </OrganizationSettings>
                </SettingsStack>
              )}
              {activeSection === 'security' && <SecuritySettings session={session} />}
              {activeSection === 'ai' && <AiSettings />}
            </div>
          </div>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
