import { MAX_ORGANIZATION_NAME_LENGTH } from '@groam/backend/convex/modules/organizations/lengths';
import { Building2, Link2, Trash2, TriangleAlert, UploadCloud, X } from '@groam/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@groam/ui/components/alert-dialog';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { initials } from '@groam/ui/lib/avatar';
import type { ReactNode } from 'react';
import { type ChangeEvent, useRef } from 'react';
import { useOrganizationSettings } from '@/features/settings/hooks/use-organization-settings';
import {
  SettingsPanel,
  SettingsPanelHeading,
  SettingsStack
} from '@/features/settings/settings-shell/settings-panel';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type SettingsController = ReturnType<typeof useOrganizationSettings>;

/** The group's profile, then `children` (who belongs), then the owner's danger zone last. */
export function OrganizationSettings({
  canManage,
  children,
  isOwner,
  organization
}: {
  canManage: boolean;
  children?: ReactNode;
  isOwner: boolean;
  organization: ActiveOrganization;
}) {
  const settings = useOrganizationSettings(organization);

  return (
    <SettingsStack>
      <OrganizationProfile canManage={canManage} settings={settings} />
      {children}
      {isOwner && <OrganizationDangerZone organization={organization} settings={settings} />}
    </SettingsStack>
  );
}

function OrganizationProfile({
  canManage,
  settings
}: {
  canManage: boolean;
  settings: SettingsController;
}) {
  const { clearLogo, save, state, updateState, uploadLogo } = settings;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const form = useFormSubmit();
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadLogo(file);
  };

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Name, logo, and the unique URL slug for this group."
        icon={Building2}
        title="Group profile"
      />
      <Input
        accept="image/*"
        aria-label="Choose group logo"
        className="hidden"
        disabled={!canManage || state.isPending}
        onChange={upload}
        ref={logoInputRef}
        type="file"
      />
      <Form
        actions={
          <FormActions
            hint={
              canManage
                ? 'Logo uploads also appear in the group media library.'
                : 'Only owners and admins can edit these settings.'
            }
            isPending={state.isPending}
            submitDisabled={!canManage || !state.name.trim() || !state.slug.trim()}
            submitLabel="Save changes"
          />
        }
        density="relaxed"
        error={state.error ?? form.error}
        isPending={state.isPending}
        message={state.message}
        onSubmit={form.handle(save)}
      >
        <FormField label="Group logo">
          <div
            aria-label="Group logo"
            className="flex min-w-0 flex-wrap items-center gap-4"
            role="group"
          >
            <Avatar className="size-16 shrink-0 rounded-lg border border-border">
              <AvatarImage alt={state.name} src={state.logo.trim()} />
              <AvatarFallback className="rounded-lg text-xl font-semibold">
                {initials(state.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">
                {state.name.trim() || 'Untitled group'}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link2 aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">/{state.slug.trim() || 'slug'}</span>
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={state.isPending}
                  onClick={() => logoInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <UploadCloud /> {state.logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                {state.logo ? (
                  <Button
                    disabled={state.isPending}
                    onClick={() => void clearLogo()}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <X /> Remove logo
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </FormField>
        <FormField label="Group name" required>
          <Input
            disabled={!canManage || state.isPending}
            maxLength={MAX_ORGANIZATION_NAME_LENGTH}
            onChange={(event) => updateState({ name: event.target.value })}
            value={state.name}
          />
        </FormField>
        <FormField description="Used in links and must be unique." label="Slug" required>
          <Input
            disabled={!canManage || state.isPending}
            onChange={(event) => updateState({ slug: normalizeSlug(event.target.value) })}
            value={state.slug}
          />
        </FormField>
      </Form>
    </SettingsPanel>
  );
}

function OrganizationDangerZone({
  organization,
  settings
}: {
  organization: ActiveOrganization;
  settings: SettingsController;
}) {
  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Permanently remove this group, its memberships, and invitations."
        icon={TriangleAlert}
        title="Danger zone"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Delete {organization.name}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This cannot be undone. Every membership attached to the group is removed.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="shrink-0"
              data-testid={testIds.deleteGroup}
              disabled={settings.state.isPending}
              size="sm"
              variant="destructive"
            >
              <Trash2 /> Delete group
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {organization.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Better Auth will remove every membership attached to
                this group.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid={testIds.deleteGroupConfirm}
                onClick={() => void settings.remove()}
              >
                Delete group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsPanel>
  );
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '');
}
