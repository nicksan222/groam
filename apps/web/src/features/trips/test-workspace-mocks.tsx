import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { mockTripWorkspace } from './test-fixtures';

const navigate = vi.fn();
export const trips = {
  useTrips: vi.fn(),
  useWorkspaceTripProposals: vi.fn()
};

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (...args: unknown[]) => trips.useTrips(...args),
  useWorkspaceTripProposals: (...args: unknown[]) => trips.useWorkspaceTripProposals(...args)
}));

vi.mock('@tanstack/react-router', () => ({
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
}));

export function resetTripWorkspaceView() {
  vi.clearAllMocks();
  mockTripWorkspace(trips);
}
