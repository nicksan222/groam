import { authClient } from '@groam/auth/client';
import { MAX_ORGANIZATION_NAME_LENGTH } from '@groam/backend/convex/modules/organizations/lengths';
import { BrandMark } from '@groam/brand/mark';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Marker, MarkerContent } from '@groam/ui/components/marker';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { SHELL_SECTION_TITLE } from '@groam/ui/lib/shell-layout';
import { Activity, type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useWorkspaceData } from '@/features/workspace/hooks/use-workspace-data';
import { useGroupActivationStore } from '@/lib/stores/group-activation-store';
import { testIds } from '@/lib/test-ids';
import { JoinFirstGroupForm } from './join-first-group-form';
import { createSlug, WorkspaceContext, type WorkspaceContextValue } from './workspace-state';

// oxlint-disable-next-line groam/no-local-type-definitions -- local hold for Better Auth refetch flicker
type HeldWorkspace = {
  userId: string;
  value: WorkspaceContextValue;
};

const workspaceLoading = (
  <main className="flex min-h-dvh">
    <PageLoading />
  </main>
);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { activationError, isPending, isSignedOut, retryActivation, value, viewerName } =
    useWorkspaceData();
  // Better Auth marks its queries pending again on every refetch. Holding the last
  // known workspace keeps the page mounted so it cannot fall back to a loading state.
  // Scope the hold to the current user and only while auth is pending — otherwise a
  // reseed / missing activeOrganizationId can keep Convex workspace queries running
  // against a session that has no active organization.
  const lastValue = useRef<HeldWorkspace | null>(null);

  useEffect(() => {
    if (isSignedOut) {
      lastValue.current = null;
      return;
    }
    if (value) {
      lastValue.current = { userId: value.session.user.id, value };
      return;
    }
    if (!isPending) lastValue.current = null;
  }, [isPending, isSignedOut, value]);

  const heldUserId = lastValue.current?.userId;
  const heldValue = lastValue.current?.value ?? null;
  const currentUserId = value?.session.user.id;
  const canReuseHeld =
    isPending &&
    heldValue !== null &&
    heldUserId !== undefined &&
    (currentUserId === undefined || currentUserId === heldUserId);
  const workspace = isSignedOut ? null : (value ?? (canReuseHeld ? heldValue : null));
  const activatingId = useGroupActivationStore((store) => store.organizationId);
  const activeId = workspace?.activeOrganization.id;
  const isSwitchingGroup = activatingId !== null && activatingId !== activeId;

  useEffect(() => {
    if (activatingId !== null && activatingId === activeId) {
      useGroupActivationStore.setState({ organizationId: null });
    }
  }, [activatingId, activeId]);

  if (workspace) {
    // A group switch opens a different workspace: hide the old one (dropping its queries) until
    // the session reports the new group, then remount so group-scoped state, such as pagination
    // cursors, starts fresh instead of leaking across groups.
    return (
      <WorkspaceContext key={workspace.activeOrganization.id} value={workspace}>
        {isSwitchingGroup && workspaceLoading}
        <Activity mode={isSwitchingGroup ? 'hidden' : 'visible'}>{children}</Activity>
      </WorkspaceContext>
    );
  }
  if (isPending) return workspaceLoading;
  if (activationError) {
    return <WorkspaceError message={activationError} onRetry={retryActivation} />;
  }
  return <CreateFirstOrganization viewerName={viewerName} />;
}

function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className={SHELL_SECTION_TITLE}>Unable to load workspace</h1>
        <FormFeedback className="mt-2" error={message} />
        <Button className="mt-6" data-testid={testIds.workspaceErrorRetry} onClick={onRetry}>
          Try again
        </Button>
      </section>
    </main>
  );
}

function CreateFirstOrganization({ viewerName }: { viewerName: string }) {
  const [name, setName] = useState('');
  const form = useFormSubmit({ fallbackError: 'Unable to create group' });

  const createOrganization = form.handle(async () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const result = await authClient.organization.create({
      name: normalizedName,
      slug: createSlug(normalizedName)
    });
    if (result.error) throw new Error(result.error.message ?? 'Unable to create group');
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <BrandMark className="mb-6 size-8 shrink-0" decorative />
        <h1 className={SHELL_SECTION_TITLE} data-testid={testIds.onboardingWelcome}>
          Welcome, {viewerName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first group. Every member will automatically share the group’s trips.
        </p>
        <Form
          actions={
            <FormActions
              fullWidth
              isPending={form.isPending}
              submitDisabled={!name.trim()}
              submitLabel="Create group"
              submitTestId={testIds.onboardingCreateGroup}
            />
          }
          className="mt-6"
          error={form.error}
          isPending={form.isPending}
          onSubmit={createOrganization}
        >
          <FormField label="Group name" maxLength={MAX_ORGANIZATION_NAME_LENGTH} required>
            <Input
              data-testid={testIds.onboardingGroupName}
              disabled={form.isPending}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. The Smiths"
              value={name}
            />
          </FormField>
        </Form>
        <Marker aria-hidden className="my-6" variant="separator">
          <MarkerContent>
            <Shell.Eyebrow as="span" size="label">
              or
            </Shell.Eyebrow>
          </MarkerContent>
        </Marker>
        <JoinFirstGroupForm />
      </section>
    </main>
  );
}
