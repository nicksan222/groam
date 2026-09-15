import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceAssistantWidget } from './workspace-assistant-widget';

const location = vi.hoisted(() => ({ pathname: '/' }));
const widget = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({ useLocation: () => location }));
vi.mock('@groam/ui/ai/chat/ai-assistant-widget', () => ({
  AiAssistantWidget: () => {
    widget();
    return <aside aria-label="Groam AI" />;
  }
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

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
])('does not mount the assistant on %s', (pathname) => {
  location.pathname = pathname;
  render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  expect(screen.queryByRole('complementary', { name: 'Groam AI' })).toBeNull();
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
])('keeps contextual assistance available on %s', (pathname) => {
  location.pathname = pathname;
  render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  expect(screen.getByRole('complementary', { name: 'Groam AI' })).toBeTruthy();
});

test('removes the widget when navigating to a run and restores it on planning pages', () => {
  location.pathname = '/trips/trip-1/overview';
  const view = render(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  expect(screen.getByRole('complementary', { name: 'Groam AI' })).toBeTruthy();
  location.pathname = '/agents/reviewer/run-1';
  view.rerender(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  expect(screen.queryByRole('complementary', { name: 'Groam AI' })).toBeNull();
  location.pathname = '/ideas';
  view.rerender(<WorkspaceAssistantWidget organizationId="workspace-1" />);
  expect(screen.getByRole('complementary', { name: 'Groam AI' })).toBeTruthy();
});
