import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useEmailSettings } from '@/features/settings/hooks/use-email-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';

export function EmailSettings({ email }: { email: string }) {
  const { state, setEmail, save } = useEmailSettings();
  return (
    <SettingsPanel>
      <SettingsPanelHeading
        title="Account email"
        description="Use an address you can access for sign-in and password recovery."
      />
      <p className="break-all text-sm text-muted-foreground">Current address: {email}</p>
      <form
        className="mt-4 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <FormField label="New email address" required>
          <Input
            type="email"
            autoComplete="email"
            value={state.email}
            disabled={state.pending}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>
        <FormFeedback error={state.error} message={state.message} />
        <Button type="submit" disabled={state.pending || !state.email.trim()}>
          {state.pending ? 'Sending verification…' : 'Verify new email'}
        </Button>
      </form>
    </SettingsPanel>
  );
}
