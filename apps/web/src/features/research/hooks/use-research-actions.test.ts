import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useCreateResearch, useLinkResearch, useResearchActions } from './use-research-actions';

const convex = vi.hoisted(() => ({ useAction: vi.fn(), useMutation: vi.fn(), useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
const ui = vi.hoisted(() => ({ context: null as unknown, error: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: ui.error, success: vi.fn() } }));
vi.mock('@groam/ai/ui/context/agent-context', () => ({ useCurrentAgentContext: () => ui.context }));
vi.mock('@groam/ai/ui/context/agent-screen-context', () => ({
  serializeAgentScreenContext: () => ({ serialized: true })
}));

const discussionId = 'r1' as Id<'discussions'>;

beforeEach(() => {
  vi.clearAllMocks();
  ui.context = null;
  convex.useAction.mockReturnValue(vi.fn());
});

test('create passes the subject as title with a request id', async () => {
  const create = vi.fn().mockResolvedValue('r9');
  convex.useMutation.mockReturnValue(create);
  const { result } = await renderHook(() => useCreateResearch('t1' as Id<'trips'>));
  let id: unknown;
  await act(async () => {
    id = await result.current({ brief: 'why', subject: 'Hotels' });
  });
  expect(id).toBe('r9');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ brief: 'why', title: 'Hotels', tripId: 't1' })
  );
});

test('summarize sends the prompt to the researcher agent', async () => {
  const send = vi.fn().mockResolvedValue({ assistantAgent: null, messageId: 'm1' });
  convex.useMutation.mockReturnValue(send);
  const { result } = await renderHook(() => useResearchActions(discussionId));
  await act(async () => {
    await result.current.summarize();
  });
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      assistantAgent: 'researcher',
      discussionId,
      text: 'Summarize this research'
    })
  );
});

test('unlink and updateBrief map to the backend routes', async () => {
  const mutate = vi.fn().mockResolvedValue(null);
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => useResearchActions(discussionId));
  await act(async () => {
    await result.current.unlink({ id: 's1', kind: 'stay' });
    await result.current.updateBrief('');
  });
  expect(mutate).toHaveBeenCalledWith({
    discussionId,
    target: { kind: 'tripTarget', target: { id: 's1', type: 'stay' } }
  });
  expect(mutate).toHaveBeenCalledWith({ brief: '', discussionId });
});

test('create toasts and resolves null when the mutation fails', async () => {
  convex.useMutation.mockReturnValue(vi.fn().mockRejectedValue(new Error('nope')));
  const { result } = await renderHook(() => useCreateResearch('t1' as Id<'trips'>));
  let id: unknown;
  await act(async () => {
    id = await result.current({ subject: 'Hotels' });
  });
  expect(id).toBeNull();
  expect(ui.error).toHaveBeenCalled();
});

test('link, unlink, remove and updateBrief resolve true and call the routes', async () => {
  const mutate = vi.fn().mockResolvedValue(null);
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => useResearchActions(discussionId));
  const done: boolean[] = [];
  await act(async () => {
    done.push(await result.current.link({ id: 'i1', kind: 'issue' }));
    done.push(await result.current.remove());
    done.push(await result.current.updateBrief('why'));
  });
  expect(done).toEqual([true, true, true]);
  expect(mutate).toHaveBeenCalledWith({ discussionId, target: { issueId: 'i1', kind: 'issue' } });
  expect(mutate).toHaveBeenCalledWith({ discussionId });
});

test('writes resolve false and toast when they fail', async () => {
  convex.useMutation.mockReturnValue(vi.fn().mockRejectedValue(new Error('denied')));
  const { result } = await renderHook(() => useResearchActions(discussionId));
  const done: boolean[] = [];
  await act(async () => {
    done.push(await result.current.link({ id: 'a1', kind: 'activity' }));
    done.push(await result.current.remove());
    done.push(await result.current.unlink({ id: 'd1', kind: 'destination' }));
    done.push(await result.current.updateBrief('x'));
  });
  expect(done).toEqual([false, false, false, false]);
  expect(ui.error).toHaveBeenCalledTimes(4);
});

test('useLinkResearch maps an idea target', async () => {
  const mutate = vi.fn().mockResolvedValue(null);
  convex.useMutation.mockReturnValue(mutate);
  const { result } = await renderHook(() => useLinkResearch());
  await act(async () => {
    await result.current(discussionId, { id: 'p1', kind: 'idea' });
  });
  expect(mutate).toHaveBeenCalledWith({ discussionId, target: { kind: 'idea', proposalId: 'p1' } });
});

test('summarize asks the researcher to respond when an agent and screen exist', async () => {
  ui.context = { screen: true };
  const respond = vi.fn().mockResolvedValue(undefined);
  convex.useAction.mockReturnValue(respond);
  convex.useMutation.mockReturnValue(
    vi.fn().mockResolvedValue({ assistantAgent: 'researcher', messageId: 'm1' })
  );
  const { result } = await renderHook(() => useResearchActions(discussionId));
  let ok: boolean | undefined;
  await act(async () => {
    ok = await result.current.summarize();
  });
  expect(ok).toBe(true);
  expect(respond).toHaveBeenCalledWith({
    discussionId,
    promptMessageId: 'm1',
    screen: { serialized: true }
  });
  expect(result.current.isSummarizing).toBe(false);
});

test('summarize toasts when the respond action fails', async () => {
  ui.context = { screen: true };
  convex.useAction.mockReturnValue(vi.fn().mockRejectedValue(new Error('boom')));
  convex.useMutation.mockReturnValue(
    vi.fn().mockResolvedValue({ assistantAgent: 'researcher', messageId: 'm1' })
  );
  const { result } = await renderHook(() => useResearchActions(discussionId));
  await act(async () => {
    await result.current.summarize();
  });
  await vi.waitFor(() => expect(ui.error).toHaveBeenCalled());
});

test('summarize resolves false and toasts when sending fails', async () => {
  convex.useMutation.mockReturnValue(vi.fn().mockRejectedValue(new Error('down')));
  const { result } = await renderHook(() => useResearchActions(discussionId));
  let ok: boolean | undefined;
  await act(async () => {
    ok = await result.current.summarize();
  });
  expect(ok).toBe(false);
  expect(ui.error).toHaveBeenCalled();
});
