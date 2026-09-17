import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { KeyRound, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { usePasswordSettings } from '@/features/settings/hooks/use-password-settings';
import { AccountRecoverySettings } from '@/features/settings/settings-panels/account-recovery-settings';
import { PasskeySettings } from '@/features/settings/settings-panels/passkey-settings';
import { SessionSettings } from '@/features/settings/settings-panels/session-settings';
import {
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout
} from '@/features/settings/settings-shell/settings-panel';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { userIdentityLabel } from '@/lib/user-identity';
import { TwoFactorSettings } from './two-factor-settings';

export function SecuritySettings({ session }: { session: Session }) {
  const { save, state, updateState } = usePasswordSettings();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  return (
    <SettingsSplitLayout
      aside={
        <>
          <SettingsAside
            animationDelay="60ms"
            description="Prefer a passphrase you can remember. After you save, only this browser stays signed in — other sessions are cleared."
            icon={KeyRound}
            title="A quick note"
          />
          <div style={{ animationDelay: '100ms' }}>
            <SessionSettings currentToken={session.session.token} />
          </div>
        </>
      }
      asideWidth="22rem"
    >
      <div className="space-y-6">
        <PasskeySettings />
        <TwoFactorSettings enabled={session.user.twoFactorEnabled ?? false} />
        <AccountRecoverySettings />
        <SettingsPanel>
          <SettingsPanelHeading
            description={`Signed in as ${userIdentityLabel(session.user)}`}
            icon={ShieldCheck}
            title="Change password"
          />
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Current password">
              <Input
                autoComplete="current-password"
                disabled={state.isPending}
                onChange={(event) => updateState({ currentPassword: event.target.value })}
                required
                type="password"
                value={state.currentPassword}
              />
            </FormField>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <FormField description="Use at least 8 characters." label="New password">
                <Input
                  autoComplete="new-password"
                  disabled={state.isPending}
                  minLength={8}
                  onChange={(event) => updateState({ newPassword: event.target.value })}
                  required
                  type="password"
                  value={state.newPassword}
                />
              </FormField>
              <FormField label="Confirm new password">
                <Input
                  autoComplete="new-password"
                  disabled={state.isPending}
                  minLength={8}
                  onChange={(event) => updateState({ confirmPassword: event.target.value })}
                  required
                  type="password"
                  value={state.confirmPassword}
                />
              </FormField>
            </div>
            <FormFeedback error={state.error} message={state.message} />
            <SettingsFooter>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Updating your password signs out every other browser and device on this account.
              </p>
              <Button
                disabled={
                  state.isPending ||
                  !state.currentPassword ||
                  !state.newPassword ||
                  !state.confirmPassword
                }
                type="submit"
              >
                {state.isPending && <Spinner />}
                Update password
              </Button>
            </SettingsFooter>
          </form>
        </SettingsPanel>
      </div>
    </SettingsSplitLayout>
  );
}
