import { MonitorCog } from '@groam/icons';
import { ThemeSelector } from '@groam/ui/components/theme-selector';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';

export function AppearanceSettings() {
  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Pick a light, dark, or device-matched color scheme for this browser"
        icon={MonitorCog}
        title="Color theme"
      />
      <div className="space-y-3">
        <ThemeSelector labels={{ dark: 'Dark', light: 'Light', system: 'System' }} />
        <p className="text-xs text-muted-foreground">
          Saved on this device. System follows your OS setting and updates automatically when it
          changes. Other devices keep their own preference.
        </p>
      </div>
    </SettingsPanel>
  );
}
