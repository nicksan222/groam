import Shell from '@groam/ui/components/shell/client';
import { testIds } from '@/lib/test-ids';
import { type SettingsSection, visibleSettingsSections } from './settings-sections';

const sectionTestIds: Record<SettingsSection, string> = {
  ai: testIds.settingsSectionAi,
  appearance: testIds.settingsSectionAppearance,
  data: testIds.settingsSectionData,
  group: testIds.settingsSectionGroup,
  profile: testIds.settingsSectionProfile,
  security: testIds.settingsSectionSecurity
};

const sectionTitles: Record<SettingsSection, string> = {
  ai: 'AI',
  appearance: 'Appearance',
  data: 'Data',
  group: 'Group',
  profile: 'Profile',
  security: 'Security'
};

export function SettingsSectionNav({
  activeSection,
  hideAi = false,
  onSectionChange
}: {
  activeSection: SettingsSection;
  hideAi?: boolean;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <Shell.UnderlineNav aria-label="Settings sections">
      {visibleSettingsSections().map((id) =>
        hideAi && id === 'ai' ? null : (
          <Shell.Tab
            data-testid={sectionTestIds[id]}
            isActive={activeSection === id}
            key={id}
            onClick={() => onSectionChange(id)}
            position="top"
            title={sectionTitles[id]}
          />
        )
      )}
    </Shell.UnderlineNav>
  );
}
