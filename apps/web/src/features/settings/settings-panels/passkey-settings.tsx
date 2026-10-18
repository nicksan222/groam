import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { usePasskeySettings } from '@/features/settings/hooks/use-passkey-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';

export function PasskeySettings() {
  const passkeys = usePasskeySettings();
  const [name, setName] = useState('');

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Sign in without email or a password using this device, a password manager, or a security key. Add two passkeys so one can be your backup."
        icon={KeyRound}
        title="Passkeys"
      />
      <div className="space-y-4">
        {passkeys.isLoading && passkeys.passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading passkeys…</p>
        ) : (
          <div className="space-y-2">
            {passkeys.passkeys.map((passkey) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                key={passkey.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{passkey.name || 'Passkey'}</p>
                  <p className="text-xs text-muted-foreground">
                    {passkey.backedUp ? 'Synced or backed up' : 'This device or security key'}
                  </p>
                </div>
                <Button
                  aria-label={`Remove ${passkey.name || 'passkey'}`}
                  disabled={passkeys.pendingId !== null}
                  onClick={() => void passkeys.remove(passkey.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  {passkeys.pendingId === passkey.id ? <Spinner /> : <Trash2 />}
                </Button>
              </div>
            ))}
            {passkeys.passkeys.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No passkeys yet. Add one now, then add a second from another device.
              </p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            data-testid={testIds.settingsPasskeyName}
            disabled={passkeys.pendingId !== null}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Passkey name, e.g. Laptop"
            value={name}
          />
          <Button
            data-testid={testIds.settingsPasskeyAdd}
            disabled={passkeys.pendingId !== null}
            onClick={() => void passkeys.add(name)}
            type="button"
          >
            {passkeys.pendingId === 'add' ? <Spinner /> : <Plus />}
            Add passkey
          </Button>
        </div>
        <FormFeedback error={passkeys.error} />
      </div>
    </SettingsPanel>
  );
}
