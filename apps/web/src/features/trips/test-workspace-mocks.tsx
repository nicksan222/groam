import type { ReactNode } from 'react';
import { vi } from 'vite-plus/test';
import { mockTripWorkspace } from './test-fixtures';

const navigate = vi.fn();
export const trips = {
  useTrips: vi.fn(),
  useWorkspaceTripProposals: vi.fn()
};

// Module doubles for views that render the trips workspace. `vi.mock` only registers when it is
// called from the test file itself, so each test file wires these in:
//   vi.mock('<module>', async () => (await import('@/features/trips/test-workspace-mocks')).<double>);
export const agentContextModule = { useSetAgentContext: () => undefined };

export const workspaceStateModule = {
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    session: { user: { id: 'user-alex' } }
  })
};

export const useTripsModule = {
  useTrips: (...args: unknown[]) => trips.useTrips(...args),
  useWorkspaceTripProposals: (...args: unknown[]) => trips.useWorkspaceTripProposals(...args)
};

export async function tripRouterModule() {
  return {
    ...(await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')),
    Link: ({
      children,
      to
    }: {
      children: ReactNode;
      params?: unknown;
      search?: unknown;
      to: string;
    }) => <a href={to}>{children}</a>,
    useNavigate: () => navigate
  };
}

export function resetTripWorkspaceView() {
  vi.clearAllMocks();
  mockTripWorkspace(trips);
}
