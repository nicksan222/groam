import { env } from '@groam/env/web-client';
import { ThemeSelector } from '@groam/ui/components/theme-selector';
import { MonitorCog, Sparkles } from 'lucide-react';
import {
  SettingsAside,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout
} from '@/features/settings/settings-shell/settings-panel';

export function AppearanceSettings() {
  return (
    <SettingsSplitLayout
      aside={
        <SettingsAside
          animationDelay="70ms"
          description="System follows your OS setting and updates automatically when it changes. Other devices keep their own preference."
          icon={Sparkles}
          title="Saved on this device"
        />
      }
    >
      <SettingsPanel>
        <SettingsPanelHeading
          description={
            env.isDesktop
              ? 'Pick a light, dark, or device-matched color scheme for this app.'
              : 'Pick a light, dark, or device-matched color scheme for this browser.'
          }
          icon={MonitorCog}
          title="Color theme"
        />
        <div className="-mx-1">
          <ThemeSelector labels={{ dark: 'Dark', light: 'Light', system: 'System' }} />
        </div>
      </SettingsPanel>
    </SettingsSplitLayout>
  );
}
