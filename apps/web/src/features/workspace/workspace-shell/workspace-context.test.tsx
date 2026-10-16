import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useGroupActivationStore } from '@/lib/stores/group-activation-store';
import { WorkspaceProvider } from './workspace-context';

const data = vi.hoisted(() => ({
  current: {
    activationError: null as string | null,
    isPending: false,
    isSignedOut: false,
    retryActivation: vi.fn(),
    value: null as unknown,
    viewerName: 'Ada'
  }
}));

vi.mock('@/features/workspace/hooks/use-workspace-data', () => ({
  useWorkspaceData: () => data.current
}));

vi.mock('@groam/auth/client', () => ({
  authClient: { organization: { create: vi.fn() } }
}));

vi.mock('./join-first-group-form', () => ({
  JoinFirstGroupForm: () => <p>Join with invitation code</p>
}));

const workspace = {
  activeOrganization: { id: 'organization-a', members: [] },
  activeRole: 'owner',
  organizations: [],
  session: { user: { id: 'user-a' } },
  switchOrganization: vi.fn()
};

beforeEach(() => {
  useGroupActivationStore.setState({ organizationId: null });
  data.current = {
    activationError: null,
    isPending: false,
    isSignedOut: false,
    retryActivation: vi.fn(),
    value: workspace,
    viewerName: 'Ada'
  };
});

test('keeps the workspace mounted while auth queries refetch', async () => {
  const view = await render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  await expect.element(page.getByText('Trip page')).toBeInTheDocument();

  data.current = { ...data.current, isPending: true, value: null };
  await view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  await expect.element(page.getByText('Trip page')).toBeInTheDocument();
  await expect.element(page.getByText('Loading your workspace…')).not.toBeInTheDocument();
});

test('drops the held workspace once the viewer is signed out', async () => {
  const view = await render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  data.current = { ...data.current, isPending: true, isSignedOut: true, value: null };
  await view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  await expect.element(page.getByText('Trip page')).not.toBeInTheDocument();
});

test('shows the loading state on the very first load', async () => {
  data.current = { ...data.current, isPending: true, value: null };
  await render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  await expect.element(page.getByText('Trip page')).not.toBeInTheDocument();
  await expect.element(page.getByText('Loading your workspace…')).toBeInTheDocument();
});

test('drops the held workspace once auth settles without an active organization', async () => {
  const view = await render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  await expect.element(page.getByText('Trip page')).toBeInTheDocument();

  data.current = { ...data.current, isPending: false, value: null };
  await view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  await expect.element(page.getByText('Trip page')).not.toBeInTheDocument();
  await expect.element(page.getByText('Welcome, Ada')).toBeInTheDocument();
  await expect.element(page.getByText('Join with invitation code')).toBeInTheDocument();
});

test('hides the workspace while another group is activated and resumes once it is active', async () => {
  const view = await render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  useGroupActivationStore.setState({ organizationId: 'organization-b' });
  await expect.element(page.getByText('Trip page')).not.toBeVisible();

  data.current = {
    ...data.current,
    value: { ...workspace, activeOrganization: { id: 'organization-b', members: [] } }
  };
  await view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  await expect.element(page.getByText('Trip page')).toBeVisible();
  expect(useGroupActivationStore.getState().organizationId).toBeNull();
});
