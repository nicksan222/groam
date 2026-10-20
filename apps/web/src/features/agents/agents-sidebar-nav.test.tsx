import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentsSidebarNav } from './agents-sidebar-nav';

const state = vi.hoisted(() => ({
  agents: [] as Array<{ activeRunCount: number | null }>,
  pathname: '/agents'
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: state.pathname })
}));

vi.mock('./hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: state.agents })
}));

async function renderNav() {
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
});

test('links to the agents roster', async () => {
  await renderNav();
  await expect
    .element(page.getByRole('link', { name: 'Agents' }))
    .toHaveAttribute('href', '/agents');
});

test('shows an active-run count when workers are busy', async () => {
  state.agents = [{ activeRunCount: 2 }, { activeRunCount: 1 }];
  await renderNav();
  await expect.element(page.getByText('3')).toBeInTheDocument();
});

test('shows an unknown count instead of zero when a roster window is incomplete', async () => {
  state.agents = [{ activeRunCount: null }];
  await renderNav();
  await expect
    .element(page.getByLabelText('Active run count unavailable; open agent runs'))
    .toHaveTextContent('?');
});
