import { Download, LifeBuoy } from '@groam/icons';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import { useAccountRecoverySettings } from '@/features/settings/hooks/use-account-recovery-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';
import { CurrentPasswordField } from './current-password-field';

export function AccountRecoverySettings() {
  const settings = useAccountRecoverySettings();
  const form = useFormSubmit();
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
        <Form
          density="relaxed"
          actions={
            <FormActions
              hint="Recovery codes are the fallback when you forget your password. Authenticator backup codes only bypass two-factor authentication."
              isPending={settings.isPending}
              submitDisabled={!password}
              submitIcon={<Download />}
              submitLabel="Generate and download"
              submitTestId={testIds.settingsRecoveryGenerate}
            />
          }
          error={settings.error ?? form.error}
          isPending={settings.isPending}
          message={settings.message}
          onSubmit={form.handle(() => settings.generate(password))}
        >
          <CurrentPasswordField
            disabled={settings.isPending}
            onChange={setPassword}
            required
            testId={testIds.settingsRecoveryPassword}
            value={password}
          />
        </Form>
      </div>
    </SettingsPanel>
  );
}
