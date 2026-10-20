import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { initials } from '@groam/ui/lib/avatar';
import type { FormEvent } from 'react';
import { useProfileSettings } from '@/features/settings/hooks/use-profile-settings';
import { SettingsFooter } from '@/features/settings/settings-shell/settings-panel';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';

export function ProfileSettings({ user }: { user: Session['user'] }) {
  const { save, state, updateState } = useProfileSettings(user);
  const displayName = state.name.trim() || user.name;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  return (
    <form aria-label="Profile" className="space-y-6" onSubmit={submit}>
      <div className="grid gap-3 border-b border-border pb-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
        <p className="text-sm font-medium sm:pt-2">Profile photo</p>
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16 shrink-0 border border-border">
            <AvatarImage alt={displayName} src={state.image.trim()} />
            <AvatarFallback className="text-xl font-semibold">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <p className="text-xs leading-5 text-muted-foreground">
              A square photo looks best. Your preview updates as you edit.
            </p>
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
      </div>

      <FormField
        className="border-b border-border pb-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6 sm:[&>label]:pt-2 sm:[&>input]:col-start-2 sm:[&>p]:col-start-2"
        label="Display name"
      >
        <Input
          autoComplete="name"
          disabled={state.isPending}
          maxLength={80}
          onChange={(event) => updateState({ name: event.target.value })}
          required
          value={state.name}
        />
      </FormField>
      <FormField
        className="border-b border-border pb-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6 sm:[&>label]:pt-2 sm:[&>input]:col-start-2 sm:[&>p]:col-start-2"
        description="Used to sign in and shown instead of your email. Use 3–30 letters, numbers, underscores, or dots."
        label="Username"
      >
        <Input
          autoCapitalize="none"
          autoComplete="username"
          disabled={state.isPending}
          maxLength={30}
          minLength={3}
          onChange={(event) => updateState({ username: event.target.value })}
          required
          value={state.username}
        />
      </FormField>
      <FormField
        className="border-b border-border pb-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6 sm:[&>label]:pt-2 sm:[&>input]:col-start-2 sm:[&>p]:col-start-2"
        description="Leave blank to use your initials instead."
        label="Profile photo URL"
      >
        <Input
          disabled={state.isPending}
          onChange={(event) => updateState({ image: event.target.value })}
          placeholder="https://example.com/avatar.jpg"
          type="url"
          value={state.image}
        />
      </FormField>
      <FormFeedback error={state.error} message={state.message} />
      <SettingsFooter>
        <p className="text-xs text-muted-foreground">Visible to people in your groups.</p>
        <Button
          disabled={state.isPending || !state.name.trim() || !state.username.trim()}
          type="submit"
        >
          {state.isPending && <Spinner />} Save profile
        </Button>
      </SettingsFooter>
    </form>
  );
}
