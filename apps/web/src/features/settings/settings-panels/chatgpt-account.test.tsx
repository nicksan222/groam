import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ChatGptConnection } from '@/types/ai-settings';
import { ChatGptAccount } from './chatgpt-account';

function makeAccount(overrides: Partial<ChatGptConnection> = {}): ChatGptConnection {
  return {
    connected: true,
    email: 'ada@example.com',
    id: 'primary',
    label: 'Personal ChatGPT',
    model: null,
    needsReconnect: false,
    ...overrides
  } as unknown as ChatGptConnection;
}

const onConnect = vi.fn().mockResolvedValue(undefined);
const onDisconnect = vi.fn().mockResolvedValue(undefined);
const onSelect = vi.fn().mockResolvedValue(undefined);

async function renderAccount(
  account: ChatGptConnection,
  props: { canConnect?: boolean; isActive?: boolean; isPending?: boolean } = {}
) {
  return render(
    <ChatGptAccount
      account={account}
      canConnect={props.canConnect ?? true}
      isActive={props.isActive ?? false}
      isPending={props.isPending ?? false}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSelect={onSelect}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ChatGptAccount', () => {
  test.each<[string, Partial<ChatGptConnection>, boolean, string]>([
    ['connected', {}, false, 'Connected'],
    ['connected and active', {}, true, 'Connected · Active account'],
    ['disconnected', { connected: false }, false, 'Disconnected'],
    ['needs reconnect', { needsReconnect: true }, false, 'Reconnect required']
  ])('shows the %s status', async (_, overrides, isActive, status) => {
    await renderAccount(makeAccount(overrides), { isActive });
    await expect.element(page.getByText('Personal ChatGPT')).toBeVisible();
    await expect.element(page.getByText(status, { exact: true })).toBeVisible();
  });

  test('an inactive connected account can be selected or disconnected', async () => {
    await renderAccount(makeAccount());
    await page.getByRole('button', { name: 'Use account' }).click();
    expect(onSelect).toHaveBeenCalledWith('primary');
    await page.getByRole('button', { name: 'Disconnect' }).click();
    expect(onDisconnect).toHaveBeenCalledWith('primary');
    await expect.element(page.getByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
  });

  test('the active account cannot be selected again and tags its disconnect button', async () => {
    await renderAccount(makeAccount(), { isActive: true });
    await expect.element(page.getByRole('button', { name: 'Use account' })).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.settingsAiRemove)).toBeVisible();
  });

  test.each([
    ['disconnected', { connected: false }],
    ['needing reconnect', { needsReconnect: true }]
  ])('offers reconnect for an account that is %s', async (_, overrides) => {
    await renderAccount(makeAccount(overrides));
    await page.getByRole('button', { name: 'Reconnect' }).click();
    expect(onConnect).toHaveBeenCalledWith('primary');
    await expect.element(page.getByRole('button', { name: 'Use account' })).not.toBeInTheDocument();
  });

  test('hides reconnect when connecting is unavailable', async () => {
    await renderAccount(makeAccount({ connected: false }), { canConnect: false });
    await expect.element(page.getByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
  });

  test('disables actions while pending', async () => {
    await renderAccount(makeAccount(), { isPending: true });
    await expect.element(page.getByRole('button', { name: 'Use account' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Disconnect' })).toBeDisabled();
  });
});
