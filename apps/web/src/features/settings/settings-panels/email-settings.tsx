import { AtSign } from '@groam/icons';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useEmailSettings } from '@/features/settings/hooks/use-email-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';

export function EmailSettings({ email }: { email: string }) {
  const { state, setEmail, save } = useEmailSettings();
  const form = useFormSubmit();
  const busy = state.isConfirming || state.isPending;
  return (
    <SettingsPanel>
      <SettingsPanelHeading
        icon={AtSign}
        title="Account email"
        description="Use an address you can access for sign-in and password recovery."
      />
      <p className="break-all text-sm text-muted-foreground">
        {email.endsWith('@users.invalid') ? 'No email on file' : `Current address: ${email}`}
      </p>
      <Form
        density="relaxed"
        actions={
          <FormActions
            isPending={busy}
            submitDisabled={!state.email.trim()}
            submitLabel="Verify new email"
          />
        }
        className="mt-4"
        error={state.error ?? form.error}
        isPending={busy}
        message={state.message}
        onSubmit={form.handle(save)}
      >
        <FormField label="New email address" required>
          <Input
            type="email"
            autoComplete="email"
            value={state.email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
      </Form>
    </SettingsPanel>
  );
}
