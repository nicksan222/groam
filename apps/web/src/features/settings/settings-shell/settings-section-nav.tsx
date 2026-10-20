import { Bot, Building2, MonitorCog, ShieldCheck, UserRound } from '@groam/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { testIds } from '@/lib/test-ids';
import { type SettingsSection, isSettingsSection, settingsSections } from './settings-sections';

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

const sectionIcons = {
  ai: Bot,
  appearance: MonitorCog,
  group: Building2,
  profile: UserRound,
  security: ShieldCheck
};

export function SettingsSectionNav({
  activeSection,
  onSectionChange
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <nav aria-label="Settings sections" className="min-w-0 md:sticky md:top-4">
      <div className="md:hidden">
        <Select
          value={activeSection}
          onValueChange={(value) => {
            if (isSettingsSection(value)) onSectionChange(value);
          }}
        >
          <SelectTrigger aria-label="Settings section" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingsSections.map((id) => (
              <SelectItem key={id} value={id}>
                {sectionTitles[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SidebarMenu className="hidden text-sidebar-foreground md:flex">
        {settingsSections.map((id) => {
          const Icon = sectionIcons[id];
          return (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                aria-current={activeSection === id ? 'page' : undefined}
                isActive={activeSection === id}
                data-testid={sectionTestIds[id]}
                onClick={() => onSectionChange(id)}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{sectionTitles[id]}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
