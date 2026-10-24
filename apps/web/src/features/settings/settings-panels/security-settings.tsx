import { ShieldCheck } from '@groam/icons';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { usePasswordSettings } from '@/features/settings/hooks/use-password-settings';
import { AccountRecoverySettings } from '@/features/settings/settings-panels/account-recovery-settings';
import { PasskeySettings } from '@/features/settings/settings-panels/passkey-settings';
import { SessionSettings } from '@/features/settings/settings-panels/session-settings';
import {
  SettingsPanel,
  SettingsPanelHeading,
  SettingsStack
} from '@/features/settings/settings-shell/settings-panel';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';
import { CurrentPasswordField } from './current-password-field';
import { TwoFactorSettings } from './two-factor-settings';

export function SecuritySettings({ session }: { session: Session }) {
  const { save, state, updateState } = usePasswordSettings();
  const form = useFormSubmit();

  return (
    <SettingsStack>
      <PasskeySettings />
      <TwoFactorSettings enabled={session.user.twoFactorEnabled ?? false} />
      <AccountRecoverySettings />
      <SettingsPanel>
        <SettingsPanelHeading
          description={`Signed in as ${userIdentityLabel(session.user)}`}
          icon={ShieldCheck}
          title="Change password"
        />
        <Form
          actions={
            <FormActions
              hint="Updating your password signs out every other browser and device on this account."
              isPending={state.isPending}
              submitDisabled={
                !state.currentPassword || !state.newPassword || !state.confirmPassword
              }
              submitLabel="Update password"
            />
          }
          density="relaxed"
          error={state.error ?? form.error}
          isPending={state.isPending}
          message={state.message}
          onSubmit={form.handle(save)}
        >
          <CurrentPasswordField
            disabled={state.isPending}
            onChange={(currentPassword) => updateState({ currentPassword })}
            required
            value={state.currentPassword}
          />
          <FormField description="Use at least 8 characters." label="New password" required>
            <Input
              autoComplete="new-password"
              disabled={state.isPending}
              onChange={(event) => updateState({ newPassword: event.target.value })}
              type="password"
              value={state.newPassword}
            />
          </FormField>
          <FormField label="Confirm new password" required>
            <Input
              autoComplete="new-password"
              disabled={state.isPending}
              onChange={(event) => updateState({ confirmPassword: event.target.value })}
              type="password"
              value={state.confirmPassword}
            />
          </FormField>
        </Form>
      </SettingsPanel>
      <SessionSettings currentToken={session.session.token} />
    </SettingsStack>
  );
}
