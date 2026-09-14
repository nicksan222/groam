import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { AgentsSidebarNav } from './agents-sidebar-nav';

const state = vi.hoisted(() => ({
  agents: [] as Array<{ activeRunCount: number }>,
  pathname: '/agents'
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: state.pathname })
}));

vi.mock('./hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: state.agents })
}));

function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <AgentsSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.agents = [];
  state.pathname = '/agents';
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('links to the agents roster', () => {
  renderNav();
  expect(screen.getByRole('link', { name: 'Agents' }).getAttribute('href')).toBe('/agents');
});

test('shows an active-run count when workers are busy', () => {
  state.agents = [{ activeRunCount: 2 }, { activeRunCount: 1 }];
  renderNav();
  expect(screen.getByText('3')).toBeTruthy();
});
