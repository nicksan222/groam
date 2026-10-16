import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AiSettings } from './ai-settings';

const ai = vi.hoisted(() => ({
  remote: {
    available: true,
    unavailableReason: null as string | null,
    activeConnectionId: null,
    planNoticeAcknowledged: false,
    connections: [] as Array<{
      id: string;
      label: string;
      email: string;
      connected: boolean;
      needsReconnect: boolean;
      model: string | null;
    }>
  },
  connection: undefined as
    | undefined
    | { connected: boolean; needsReconnect: boolean; model: string | null },
  models: [],
  modelsLoading: false,
  isLoading: false,
  isPending: false,
  error: null,
  message: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  selectConnection: vi.fn(),
  selectModel: vi.fn(),
  acknowledge: vi.fn()
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children: import('react').ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/features/settings/hooks/use-ai-settings', () => ({ useAiSettings: () => ai }));
beforeEach(() => {
  vi.clearAllMocks();
  ai.remote.available = true;
  ai.remote.unavailableReason = null;
  ai.remote.planNoticeAcknowledged = false;
  ai.remote.connections = [];
  ai.connection = undefined;
});
test('offers ChatGPT sign in and background activity', async () => {
  await render(<AiSettings />);
  await expect
    .element(page.getByRole('link', { name: 'Background activity' }))
    .toHaveAttribute('href', '/agents');
  await page.getByRole('button', { name: 'Continue with ChatGPT' }).click();
  expect(ai.connect).toHaveBeenCalled();
});
test('explains hosted deployment unavailability and disables connection', async () => {
  ai.remote.available = false;
  ai.remote.unavailableReason = 'This hosted deployment requires approved ChatGPT plan access.';
  await render(<AiSettings />);
  await expect.element(page.getByText(ai.remote.unavailableReason)).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeDisabled();
});
test('shows the one-time plan usage explanation after connection', async () => {
  ai.connection = { connected: true, needsReconnect: false, model: null };
  await render(<AiSettings />);
  await expect
    .element(page.getByText(/usage counts against your connected ChatGPT plan/))
    .toBeInTheDocument();
  await page.getByRole('button', { name: 'Got it' }).click();
  expect(ai.acknowledge).toHaveBeenCalled();
  await expect
    .element(page.getByRole('link', { name: 'Manage ChatGPT usage' }))
    .toHaveAttribute('href', 'https://chatgpt.com/settings/usage');
});
test('hides the plan notice after acknowledgment', async () => {
  ai.connection = { connected: true, needsReconnect: false, model: null };
  ai.remote.planNoticeAcknowledged = true;
  await render(<AiSettings />);
  await expect.element(page.getByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
});
test('offers reconnection for expired authorization', async () => {
  ai.remote.connections = [
    {
      id: 'one',
      label: 'Personal account',
      email: 'user@example.com',
      connected: false,
      needsReconnect: true,
      model: null
    }
  ];
  await render(<AiSettings />);
  await page.getByRole('button', { name: 'Reconnect', exact: true }).click();
  expect(ai.connect).toHaveBeenCalledWith('one');
});
