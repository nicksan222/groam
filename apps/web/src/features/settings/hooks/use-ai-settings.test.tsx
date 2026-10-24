import { act, renderHook } from '@groam/vitest-config/react';
import { getFunctionName, type FunctionReference } from 'convex/server';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useAiSettings } from './use-ai-settings';

const convex = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  models: vi.fn(),
  select: vi.fn(),
  acknowledge: vi.fn(),
  useQuery: vi.fn()
}));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: (...args: unknown[]) => convex.useQuery(...args),
  useAction: (route: unknown) =>
    getFunctionName(route as FunctionReference<'action'>).includes('/connect:')
      ? convex.connect
      : getFunctionName(route as FunctionReference<'action'>).includes('/disconnect:')
        ? convex.disconnect
        : convex.models,
  useMutation: (route: unknown) =>
    getFunctionName(route as FunctionReference<'mutation'>).includes('/select:')
      ? convex.select
      : convex.acknowledge
}));
const account = {
  id: 'connection-a',
  label: 'Personal ChatGPT',
  email: 'user@example.com',
  clientId: 'client-a',
  connected: true,
  needsReconnect: false,
  model: 'gpt-test'
};
const remote = {
  available: true,
  unavailableReason: null,
  activeConnectionId: account.id,
  planNoticeAcknowledged: false,
  connections: [account]
};
beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(remote);
  convex.models.mockResolvedValue([{ slug: 'gpt-test', displayName: 'Test model' }]);
  convex.select.mockResolvedValue(null);
  convex.disconnect.mockResolvedValue({ revoked: true });
  convex.acknowledge.mockResolvedValue(null);
});
test('loads the active account model catalog', async () => {
  const { result } = await renderHook(() => useAiSettings());
  await vi.waitFor(() =>
    expect(result.current.models).toEqual([{ slug: 'gpt-test', displayName: 'Test model' }])
  );
  expect(convex.models).toHaveBeenCalledWith({ connectionId: account.id });
});
test('clears and reloads models when the active account changes', async () => {
  const { result, rerender } = await renderHook(() => useAiSettings());
  await vi.waitFor(() => expect(result.current.models).toHaveLength(1));
  convex.models.mockResolvedValue([{ slug: 'other', displayName: 'Other model' }]);
  convex.useQuery.mockReturnValue({
    ...remote,
    activeConnectionId: 'connection-b',
    connections: [{ ...account, id: 'connection-b' }]
  });
  await rerender();
  await vi.waitFor(() => expect(result.current.models[0]?.slug).toBe('other'));
  expect(convex.models).toHaveBeenLastCalledWith({ connectionId: 'connection-b' });
});
test('saves a model only for the active connection', async () => {
  const { result } = await renderHook(() => useAiSettings());
  await act(() => result.current.selectModel('gpt-test'));
  expect(convex.select).toHaveBeenCalledWith({ connectionId: account.id, model: 'gpt-test' });
});
test('disconnects and reports incomplete remote revocation', async () => {
  convex.disconnect.mockResolvedValue({ revoked: false });
  const { result } = await renderHook(() => useAiSettings());
  await act(() =>
    result.current.disconnect(account.id as Parameters<typeof result.current.disconnect>[0])
  );
  expect(convex.disconnect).toHaveBeenCalledWith({ connectionId: account.id });
  expect(result.current.message).toContain('Manage any remaining authorization');
});
test('does not load models for an account requiring reconnection', async () => {
  convex.useQuery.mockReturnValue({
    ...remote,
    connections: [{ ...account, needsReconnect: true }]
  });
  await renderHook(() => useAiSettings());
  expect(convex.models).not.toHaveBeenCalled();
});
test('acknowledges the plan usage notice', async () => {
  const { result } = await renderHook(() => useAiSettings());
  await act(() => result.current.acknowledge());
  expect(convex.acknowledge).toHaveBeenCalledWith({});
});
test('opens authorization without storing credentials in the browser', async () => {
  const popup = { opener: window, location: { href: '' }, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  convex.connect.mockResolvedValue({
    authorizationUrl: 'https://auth.openai.com/authorize?state=opaque'
  });
  const { result } = await renderHook(() => useAiSettings());
  await act(() => result.current.connect());
  expect(open).toHaveBeenCalledWith('about:blank', '_blank');
  expect(popup.opener).toBe(null);
  expect(popup.location.href).toBe('https://auth.openai.com/authorize?state=opaque');
  expect(convex.connect).toHaveBeenCalledWith({});
  open.mockRestore();
});
test('closes the authorization window and displays connection failures', async () => {
  const popup = { opener: window, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  convex.connect.mockRejectedValue(new Error('ChatGPT plan access is unavailable'));
  const { result } = await renderHook(() => useAiSettings());
  await act(() => result.current.connect());
  expect(popup.close).toHaveBeenCalled();
  expect(result.current.error).toBe('ChatGPT plan access is unavailable');
  open.mockRestore();
});
test('reports a model catalog failure', async () => {
  convex.models.mockRejectedValue(new Error('Catalog offline'));
  const { result } = await renderHook(() => useAiSettings());
  await vi.waitFor(() => expect(result.current.error).toBe('Catalog offline'));
  expect(result.current.modelsLoading).toBe(false);
});
test('keeps a model catalog failure through later successful actions', async () => {
  convex.models.mockRejectedValue(new Error('Catalog offline'));
  const { result } = await renderHook(() => useAiSettings());
  await vi.waitFor(() => expect(result.current.modelsError).toBe('Catalog offline'));
  await act(() => result.current.acknowledge());
  expect(result.current.modelsError).toBe('Catalog offline');
  expect(result.current.error).toBe('Catalog offline');
});
test('skips saving a model without a usable connection', async () => {
  convex.useQuery.mockReturnValue({ ...remote, connections: [{ ...account, connected: false }] });
  const { result } = await renderHook(() => useAiSettings());
  await act(() => result.current.selectModel('gpt-test'));
  expect(convex.select).not.toHaveBeenCalled();
});
test('selects a connection and reports full revocation', async () => {
  const { result } = await renderHook(() => useAiSettings());
  const id = account.id as Parameters<typeof result.current.selectConnection>[0];
  await act(() => result.current.selectConnection(id));
  expect(convex.select).toHaveBeenCalledWith({ connectionId: account.id });
  await act(() => result.current.disconnect(id));
  expect(result.current.message).toBe('ChatGPT disconnected.');
});
test('reconnects a specific account', async () => {
  const popup = { opener: window, location: { href: '' }, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  convex.connect.mockResolvedValue({ authorizationUrl: 'https://auth.openai.com/authorize' });
  const { result } = await renderHook(() => useAiSettings());
  await act(() =>
    result.current.connect(account.id as Parameters<typeof result.current.connect>[0])
  );
  expect(convex.connect).toHaveBeenCalledWith({ connectionId: account.id });
  open.mockRestore();
});
test('reports loading until settings arrive', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useAiSettings());
  expect(result.current.isLoading).toBe(true);
  expect(convex.models).not.toHaveBeenCalled();
});
