import { Download, ShieldCheck } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import {
  downloadBackupCodes,
  useTwoFactorSettings
} from '@/features/settings/hooks/use-two-factor-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';
import { CurrentPasswordField } from './current-password-field';

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const settings = useTwoFactorSettings(enabled);

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Use an authenticator app. Groam does not send one-time codes by email or SMS."
        icon={ShieldCheck}
        title="Authenticator and backup codes"
      />
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Status:{' '}
          <span className="font-medium text-foreground">
            {settings.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </p>
        {settings.enrollment && !settings.isEnabled ? (
          <TwoFactorEnrollment enrollment={settings.enrollment} settings={settings} />
        ) : (
          <TwoFactorPasswordForm settings={settings} />
        )}
      </div>
    </SettingsPanel>
  );
}

function TwoFactorEnrollment({
  enrollment,
  settings
}: {
  enrollment: NonNullable<ReturnType<typeof useTwoFactorSettings>['enrollment']>;
  settings: ReturnType<typeof useTwoFactorSettings>;
}) {
  const form = useFormSubmit();
  const [code, setCode] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    void QRCode.toDataURL(enrollment.totpURI, { margin: 1, width: 224 }).then(setQrCode);
  }, [enrollment.totpURI]);

  return (
    <div className="space-y-4">
      {qrCode ? (
        <img
          alt="Authenticator setup QR code"
          className="size-56 rounded-lg border border-border"
          src={qrCode}
        />
      ) : null}
      <p
        className="break-all rounded-lg bg-muted p-3 font-mono text-xs"
        data-testid={testIds.settingsTwoFactorUri}
      >
        {enrollment.totpURI}
      </p>
      <Button
        data-testid={testIds.settingsTwoFactorDownload}
        onClick={() => downloadBackupCodes(enrollment.backupCodes)}
        type="button"
        variant="outline"
      >
        <Download /> Download backup codes
      </Button>
      <Form
        density="relaxed"
        actions={
          <FormActions
            isPending={settings.isPending}
            submitDisabled={!code.trim()}
            submitLabel="Confirm and enable"
            submitTestId={testIds.settingsTwoFactorConfirm}
          />
        }
        error={settings.error ?? form.error}
        isPending={settings.isPending}
        message={settings.message}
        onSubmit={form.handle(() => settings.confirmEnrollment(code))}
      >
        <FormField label="Authenticator code" required>
          <Input
            autoComplete="one-time-code"
            data-testid={testIds.settingsTwoFactorCode}
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </FormField>
      </Form>
    </div>
  );
}

function TwoFactorPasswordForm({
  settings
}: {
  settings: ReturnType<typeof useTwoFactorSettings>;
}) {
  const form = useFormSubmit();
  const disableForm = useFormSubmit();
  const [password, setPassword] = useState('');
  const blocked = settings.isPending || !password;

  return (
    <Form
      density="relaxed"
      actions={
        <FormActions
          hint="Backup codes are single-use. Store the downloaded file somewhere separate from your password."
          isPending={form.isPending}
          leading={
            settings.isEnabled ? (
              <Button
                disabled={blocked}
                onClick={() => void disableForm.run(() => settings.disable(password))}
                pending={disableForm.isPending}
                type="button"
                variant="destructive"
              >
                Disable 2FA
              </Button>
            ) : null
          }
          submitDisabled={blocked}
          // Both actions on an enabled 2FA replace something, so neither is Enter's default.
          submitLabel={settings.isEnabled ? undefined : 'Set up authenticator'}
          submitTestId={testIds.settingsTwoFactorStart}
        >
          {settings.isEnabled ? (
            <Button
              disabled={blocked}
              onClick={() => void form.run(() => settings.regenerate(password))}
              pending={form.isPending}
              variant="outline"
            >
              Regenerate codes
            </Button>
          ) : null}
        </FormActions>
      }
      error={settings.error ?? form.error ?? disableForm.error}
      isPending={settings.isPending}
      message={settings.message}
      onSubmit={
        settings.isEnabled
          ? (event) => event.preventDefault()
          : form.handle(() => settings.startEnrollment(password))
      }
    >
      <CurrentPasswordField
        disabled={settings.isPending}
        onChange={setPassword}
        required
        testId={testIds.settingsTwoFactorPassword}
        value={password}
      />
    </Form>
  );
}
