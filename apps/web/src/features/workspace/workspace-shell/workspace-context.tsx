import { authClient } from '@groam/auth/client';
import { env } from '@groam/env/web-client';
import { AppIcon } from '@groam/ui/components/app-icon';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Spinner } from '@groam/ui/components/spinner';
import { SHELL_TITLE } from '@groam/ui/lib/shell-layout';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useWorkspaceData } from '@/features/workspace/hooks/use-workspace-data';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';
import { createSlug, WorkspaceContext, type WorkspaceContextValue } from './workspace-state';

// biome-ignore lint/plugin/no-local-type-definitions: local hold for Better Auth refetch flicker
type HeldWorkspace = {
  userId: string;
  value: WorkspaceContextValue;
};

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

  if (workspace) return <WorkspaceContext value={workspace}>{children}</WorkspaceContext>;
  if (isPending) return <WorkspaceLoading />;
  if (activationError) {
    return <WorkspaceError message={activationError} onRetry={retryActivation} />;
  }
  return <CreateFirstOrganization viewerName={viewerName} />;
}

function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className={SHELL_TITLE}>Unable to load workspace</h1>
        <FormFeedback className="mt-2" error={message} />
        <Button className="mt-5" data-testid={testIds.workspaceErrorRetry} onClick={onRetry}>
          Try again
        </Button>
      </section>
    </main>
  );
}

function WorkspaceLoading() {
  return (
    <main className="flex min-h-dvh">
      <PageLoading />
    </main>
  );
}

function CreateFirstOrganization({ viewerName }: { viewerName: string }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submitting = useAsyncPending();

  const createOrganization = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    setError(null);
    await submitting.run(async () => {
      try {
        const result = await authClient.organization.create({
          name: normalizedName,
          slug: createSlug(normalizedName)
        });
        if (result.error) setError(result.error.message ?? 'Unable to create group');
      } catch (caughtError: unknown) {
        setError(errorMessage(caughtError, 'Unable to create group'));
      }
    });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <AppIcon className="mb-5" decorative />
        <h1 className={SHELL_TITLE} data-testid={testIds.onboardingWelcome}>
          Welcome, {viewerName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {env.isDesktop
            ? 'Create a group on this computer. Trips stay in the local Groam data folder until you export them.'
            : 'Create your first group. Every member will automatically share the group’s trips.'}
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void createOrganization();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="first-organization-name">Group name</Label>
            <Input
              data-testid={testIds.onboardingGroupName}
              disabled={submitting.isPending}
              id="first-organization-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="The Smiths"
              value={name}
            />
          </div>
          <FormFeedback error={error} />
          <Button
            className="w-full"
            data-testid={testIds.onboardingCreateGroup}
            disabled={submitting.isPending || !name.trim()}
            type="submit"
          >
            {submitting.isPending && <Spinner />}
            Create group
          </Button>
        </form>
      </section>
    </main>
  );
}
