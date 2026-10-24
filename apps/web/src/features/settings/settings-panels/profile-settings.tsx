import {
  MAX_USER_NAME_LENGTH,
  MAX_USERNAME_LENGTH
} from '@groam/backend/convex/modules/auth/lengths';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { initials } from '@groam/ui/lib/avatar';
import { useProfileSettings } from '@/features/settings/hooks/use-profile-settings';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';

export function ProfileSettings({ user }: { user: Session['user'] }) {
  const { save, state, updateState } = useProfileSettings(user);
  const displayName = state.name.trim() || user.name;
  const form = useFormSubmit();

  return (
    <Form
      actions={
        <FormActions
          hint="Visible to people in your groups."
          isPending={state.isPending}
          submitDisabled={!state.name.trim() || !state.username.trim()}
          submitLabel="Save changes"
        />
      }
      aria-label="Profile"
      density="settings"
      error={state.error ?? form.error}
      isPending={state.isPending}
      message={state.message}
      onSubmit={form.handle(save)}
    >
      <FormField label="Profile photo">
        <div aria-label="Profile photo" className="flex min-w-0 items-center gap-4" role="group">
          <Avatar className="size-16 shrink-0 border border-border">
            <AvatarImage alt={displayName} src={state.image.trim()} />
            <AvatarFallback className="text-xl font-semibold">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <MutedCopy size="xs">
              A square photo looks best. Your preview updates as you edit.
            </MutedCopy>
            {state.image ? (
              <Button
                disabled={state.isPending}
                onClick={() => updateState({ image: '' })}
                size="sm"
                type="button"
                variant="outline"
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>
      </FormField>

      <FormField label="Display name" required>
        <Input
          autoComplete="name"
          disabled={state.isPending}
          maxLength={MAX_USER_NAME_LENGTH}
          onChange={(event) => updateState({ name: event.target.value })}
          value={state.name}
        />
      </FormField>
      <FormField
        description="Used to sign in and shown instead of your email. Use 3–30 letters, numbers, underscores, or dots."
        label="Username"
        required
      >
        <Input
          autoCapitalize="none"
          autoComplete="username"
          disabled={state.isPending}
          maxLength={MAX_USERNAME_LENGTH}
          onChange={(event) => updateState({ username: event.target.value })}
          value={state.username}
        />
      </FormField>
      <FormField
        description="Leave blank to use your initials instead."
        label="Profile photo URL"
        optional
      >
        <Input
          disabled={state.isPending}
          onChange={(event) => updateState({ image: event.target.value })}
          placeholder="https://example.com/avatar.jpg"
          type="url"
          value={state.image}
        />
      </FormField>
    </Form>
  );
}
