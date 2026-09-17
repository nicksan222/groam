import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { Download, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { useAccountRecoverySettings } from '@/features/settings/hooks/use-account-recovery-settings';
import {
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';

export function AccountRecoverySettings() {
  const settings = useAccountRecoverySettings();
  const [password, setPassword] = useState('');

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Reset your password without email, an administrator, or another device."
        icon={LifeBuoy}
        title="Account recovery codes"
      />
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download these codes and keep the file somewhere separate from your password. Each code
          can recover your account. Using one code or creating a new set invalidates the entire old
          set.
        </p>
        <FormFeedback error={settings.error} message={settings.message} />
        <FormField label="Current password">
          <Input
            autoComplete="current-password"
            data-testid={testIds.settingsRecoveryPassword}
            disabled={settings.isPending}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </FormField>
        <SettingsFooter>
          <p className="max-w-md text-xs text-muted-foreground">
            Recovery codes are the fallback when you forget your password. Authenticator backup
            codes only bypass two-factor authentication.
          </p>
          <Button
            data-testid={testIds.settingsRecoveryGenerate}
            disabled={settings.isPending || !password}
            onClick={() => void settings.generate(password)}
            type="button"
          >
            {settings.isPending ? <Spinner /> : <Download />}
            Generate and download
          </Button>
        </SettingsFooter>
      </div>
    </SettingsPanel>
  );
}
