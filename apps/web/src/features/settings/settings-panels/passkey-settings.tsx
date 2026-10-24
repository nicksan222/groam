import { MAX_PASSKEY_NAME_LENGTH } from '@groam/backend/convex/modules/auth/lengths';
import { KeyRound, Trash2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import { usePasskeySettings } from '@/features/settings/hooks/use-passkey-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';

export function PasskeySettings() {
  const passkeys = usePasskeySettings();
  const form = useFormSubmit();
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
          <PageLoading label="Loading passkeys…" />
        ) : (
          <div className="space-y-2">
            {passkeys.passkeys.map((passkey) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-border py-3"
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
                  pending={passkeys.pendingId === passkey.id}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {passkeys.passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No passkeys yet. Add one now, then add a second from another device.
              </p>
            ) : null}
          </div>
        )}
        <Form
          density="relaxed"
          actions={
            <FormActions
              isPending={passkeys.pendingId === 'add'}
              submitDisabled={passkeys.pendingId !== null}
              submitLabel="Add passkey"
              submitTestId={testIds.settingsPasskeyAdd}
            />
          }
          error={passkeys.error ?? form.error}
          isPending={passkeys.pendingId === 'add'}
          onSubmit={form.handle(() => passkeys.add(name))}
        >
          <FormField label="Passkey name" optional>
            <Input
              data-testid={testIds.settingsPasskeyName}
              maxLength={MAX_PASSKEY_NAME_LENGTH}
              disabled={passkeys.pendingId !== null}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Laptop"
              value={name}
            />
          </FormField>
        </Form>
      </div>
    </SettingsPanel>
  );
}
