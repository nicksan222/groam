import Shell from '@groam/ui/components/shell/client';
import { testIds } from '@/lib/test-ids';
import { type SettingsSection, settingsSections } from './settings-sections';

const sectionTestIds: Record<SettingsSection, string> = {
  ai: testIds.settingsSectionAi,
  appearance: testIds.settingsSectionAppearance,
  group: testIds.settingsSectionGroup,
  profile: testIds.settingsSectionProfile,
  security: testIds.settingsSectionSecurity
};

const sectionTitles: Record<SettingsSection, string> = {
  ai: 'AI',
  appearance: 'Appearance',
  group: 'Group',
  profile: 'Profile',
  security: 'Security'
};

export function SettingsSectionNav({
  activeSection,
  onSectionChange
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <Shell.UnderlineNav aria-label="Settings sections">
      {settingsSections.map((id) => (
        <Shell.Tab
          data-testid={sectionTestIds[id]}
          isActive={activeSection === id}
          key={id}
          onClick={() => onSectionChange(id)}
          position="top"
          title={sectionTitles[id]}
        />
      ))}
    </Shell.UnderlineNav>
  );
}
