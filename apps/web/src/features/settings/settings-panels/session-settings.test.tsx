import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SessionSettings } from './session-settings';

const sessions = vi.hoisted(() => ({
  refresh: vi.fn(),
  revoke: vi.fn(),
  revokeOthers: vi.fn(),
  state: {
    error: null as string | null,
    isLoading: false,
    pendingAction: null as 'others' | string | null,
    sessions: [
      {
        createdAt: new Date('2026-01-01T12:00:00Z'),
        expiresAt: new Date('2026-02-01T12:00:00Z'),
        id: 'session-current',
        ipAddress: '127.0.0.1',
        token: 'current-token',
        updatedAt: new Date('2026-01-01T12:00:00Z'),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0',
        userId: 'user-a'
      },
      {
        createdAt: new Date('2026-01-02T12:00:00Z'),
        expiresAt: new Date('2026-02-02T12:00:00Z'),
        id: 'session-other',
        ipAddress: '10.0.0.2',
        token: 'other-token',
        updatedAt: new Date('2026-01-02T12:00:00Z'),
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        userId: 'user-a'
      }
    ]
  }
}));

vi.mock('@/features/settings/hooks/use-session-settings', () => ({
  useSessionSettings: () => sessions
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessions.refresh.mockResolvedValue(undefined);
  sessions.revoke.mockResolvedValue(undefined);
  sessions.revokeOthers.mockResolvedValue(undefined);
  sessions.state = {
    error: null,
    isLoading: false,
    pendingAction: null,
    sessions: sessions.state.sessions
  };
});

describe('SessionSettings', () => {
  test('lists active sessions and marks the current browser', async () => {
    await render(<SessionSettings currentToken="current-token" />);

    await expect.element(page.getByText('2 active sessions')).toBeInTheDocument();
    await expect.element(page.getByText('Current')).toBeInTheDocument();
    await expect.element(page.getByText(/Chrome on macOS/u)).toBeInTheDocument();
    await expect.element(page.getByText(/Safari on iOS/u)).toBeInTheDocument();
  });

  test('revokes another session from the panel', async () => {
    await render(<SessionSettings currentToken="current-token" />);

    await page.getByRole('button', { name: /Sign out Safari on iOS/u }).click();

    await vi.waitFor(() => expect(sessions.revoke).toHaveBeenCalledWith('other-token'));
  });

  test('signs out every other session at once', async () => {
    await render(<SessionSettings currentToken="current-token" />);

    await page.getByRole('button', { name: 'Sign out others' }).click();

    await vi.waitFor(() => expect(sessions.revokeOthers).toHaveBeenCalledWith('current-token'));
  });
});
