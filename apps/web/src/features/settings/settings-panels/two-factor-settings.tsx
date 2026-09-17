import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { Download, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import {
  downloadBackupCodes,
  useTwoFactorSettings
} from '@/features/settings/hooks/use-two-factor-settings';
import {
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';
import { CurrentPasswordField } from './current-password-field';

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const settings = useTwoFactorSettings(enabled);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.enrollment) {
      setQrCode(null);
      return;
    }
    void QRCode.toDataURL(settings.enrollment.totpURI, { margin: 1, width: 224 }).then(setQrCode);
  }, [settings.enrollment]);

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
              {settings.enrollment.totpURI}
            </p>
            <Button
              data-testid={testIds.settingsTwoFactorDownload}
              onClick={() => downloadBackupCodes(settings.enrollment?.backupCodes ?? [])}
              type="button"
              variant="outline"
            >
              <Download /> Download backup codes
            </Button>
            <FormField label="Authenticator code">
              <Input
                autoComplete="one-time-code"
                data-testid={testIds.settingsTwoFactorCode}
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                value={code}
              />
            </FormField>
            <Button
              data-testid={testIds.settingsTwoFactorConfirm}
              disabled={settings.isPending || !code.trim()}
              onClick={() => void settings.confirmEnrollment(code)}
              type="button"
            >
              {settings.isPending ? <Spinner /> : null} Confirm and enable
            </Button>
          </div>
        ) : (
          <CurrentPasswordField
            disabled={settings.isPending}
            onChange={setPassword}
            testId={testIds.settingsTwoFactorPassword}
            value={password}
          />
        )}
        <FormFeedback error={settings.error} message={settings.message} />
        {!settings.enrollment || settings.isEnabled ? (
          <SettingsFooter>
            <p className="max-w-md text-xs text-muted-foreground">
              Backup codes are single-use. Store the downloaded file somewhere separate from your
              password.
            </p>
            {settings.isEnabled ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={settings.isPending || !password}
                  onClick={() => void settings.regenerate(password)}
                  type="button"
                  variant="outline"
                >
                  Regenerate codes
                </Button>
                <Button
                  disabled={settings.isPending || !password}
                  onClick={() => void settings.disable(password)}
                  type="button"
                  variant="destructive"
                >
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <Button
                data-testid={testIds.settingsTwoFactorStart}
                disabled={settings.isPending || !password}
                onClick={() => void settings.startEnrollment(password)}
                type="button"
              >
                {settings.isPending ? <Spinner /> : null} Set up authenticator
              </Button>
            )}
          </SettingsFooter>
        ) : null}
      </div>
    </SettingsPanel>
  );
}
