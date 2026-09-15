import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

const workspace = {
  activeOrganization: { id: 'organization-a', members: [] },
  activeRole: 'owner',
  organizations: [],
  session: { user: { id: 'user-a' } },
  switchOrganization: vi.fn()
};

beforeEach(() => {
  data.current = {
    activationError: null,
    isPending: false,
    isSignedOut: false,
    retryActivation: vi.fn(),
    value: workspace,
    viewerName: 'Ada'
  };
});

afterEach(cleanup);

test('keeps the workspace mounted while auth queries refetch', () => {
  const view = render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  expect(screen.getByText('Trip page')).toBeTruthy();

  data.current = { ...data.current, isPending: true, value: null };
  view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  expect(screen.getByText('Trip page')).toBeTruthy();
  expect(screen.queryByText('Loading your workspace…')).toBeNull();
});

test('drops the held workspace once the viewer is signed out', () => {
  const view = render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  data.current = { ...data.current, isPending: true, isSignedOut: true, value: null };
  view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  expect(screen.queryByText('Trip page')).toBeNull();
});

test('shows the loading state on the very first load', () => {
  data.current = { ...data.current, isPending: true, value: null };
  render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  expect(screen.queryByText('Trip page')).toBeNull();
  expect(screen.getByText('Loading your workspace…')).toBeTruthy();
});

test('drops the held workspace once auth settles without an active organization', () => {
  const view = render(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );
  expect(screen.getByText('Trip page')).toBeTruthy();

  data.current = { ...data.current, isPending: false, value: null };
  view.rerender(
    <WorkspaceProvider>
      <p>Trip page</p>
    </WorkspaceProvider>
  );

  expect(screen.queryByText('Trip page')).toBeNull();
  expect(screen.getByText('Welcome, Ada')).toBeTruthy();
});
