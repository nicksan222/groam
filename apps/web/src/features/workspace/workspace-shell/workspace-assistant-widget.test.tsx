import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { WorkspaceAssistantWidget } from './workspace-assistant-widget';

const location = vi.hoisted(() => ({ pathname: '/' }));
const widget = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLocation: () => location
}));
vi.mock('@groam/ai/ui/chat/ai-assistant-widget', () => ({
  AiAssistantWidget: () => {
    widget();
    return <aside aria-label="Groam AI" />;
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test.each([
  '/agents',
  '/agents/',
  '/agents/reviewer',
  '/agents/reviewer/run-1',
  '/agents/issue/run-2',
  '/chat',
  '/chat/thread-1',
  '/settings',
  '/settings/profile',
  '/group',
  '/group/members',
  '/unknown',
  '/trips-archive'
])('does not mount the assistant on %s', async (pathname) => {
  location.pathname = pathname;
  await render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  await expect
    .element(page.getByRole('complementary', { name: 'Groam AI' }))
    .not.toBeInTheDocument();
  expect(widget).not.toHaveBeenCalled();
});

test.each([
  '/',
  '/trips',
  '/trips/',
  '/trips/trip-1/itinerary',
  '/trips/trip-1/ideas/idea-1/overview',
  '/ideas',
  '/ideas/idea-1',
  '/issues',
  '/issues/issue-1',
  '/inbox'
])('keeps contextual assistance available on %s', async (pathname) => {
  location.pathname = pathname;
  await render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  await expect.element(page.getByRole('complementary', { name: 'Groam AI' })).toBeInTheDocument();
});

test('removes the widget when navigating to a run and restores it on planning pages', async () => {
  location.pathname = '/trips/trip-1/overview';
  const view = await render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  await expect.element(page.getByRole('complementary', { name: 'Groam AI' })).toBeInTheDocument();
  location.pathname = '/agents/reviewer/run-1';
  await view.rerender(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  await expect
    .element(page.getByRole('complementary', { name: 'Groam AI' }))
    .not.toBeInTheDocument();
  location.pathname = '/ideas';
  await view.rerender(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  await expect.element(page.getByRole('complementary', { name: 'Groam AI' })).toBeInTheDocument();
});
