import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { LiftCard } from '@groam/ui/components/lift-card';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import { initials } from '@groam/ui/lib/avatar';
import { UserRound, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useProfileSettings } from '@/features/settings/hooks/use-profile-settings';
import {
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsStack
} from '@/features/settings/settings-shell/settings-panel';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';

export function ProfileSettings({ user }: { user: Session['user'] }) {
  const { save, state, updateState } = useProfileSettings(user);
  const displayName = state.name.trim() || user.name;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  return (
    <SettingsStack>
      <SettingsPanel>
        <SettingsPanelHeading
          description="This is how your name and photo show up to everyone you travel with."
          icon={UserRound}
          title="Personal information"
        />
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <LiftCard>
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 border-b border-border px-4">
                <Avatar className="size-24 border border-border sm:size-28">
                  <AvatarImage alt={displayName} src={state.image.trim()} />
                  <AvatarFallback className="text-2xl font-semibold tracking-tight">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5 text-center">
                  <p className="truncate text-sm font-semibold tracking-tight">{displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="space-y-2 p-3.5">
                <Shell.Eyebrow>Preview</Shell.Eyebrow>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Updates live as you edit. A square photo looks best in the group.
                </p>
                {state.image ? (
                  <Button
                    className="w-full"
                    disabled={state.isPending}
                    onClick={() => updateState({ image: '' })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <X /> Remove photo
                  </Button>
                ) : null}
              </div>
            </LiftCard>

            <div className="space-y-4">
              <FormField label="Display name">
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
                description="Your sign-in email is managed by your account."
                label="Email address"
              >
                <Input disabled readOnly type="email" value={user.email} />
              </FormField>
              <FormField
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
            </div>
          </div>

          <FormFeedback error={state.error} message={state.message} />
          <SettingsFooter>
            <p className="text-xs text-muted-foreground">Visible to people in your groups.</p>
            <Button disabled={state.isPending || !state.name.trim()} type="submit">
              {state.isPending && <Spinner />}
              Save profile
            </Button>
          </SettingsFooter>
        </form>
      </SettingsPanel>
    </SettingsStack>
  );
}
