import { render } from '@groam/vitest-config/react';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { beforeAll, expect, test, vi } from 'vite-plus/test';
import { createAppRouter } from '@/routes/route-tree';

// Every transition behaves as one a newer navigation skipped: `ready` and `finished` reject. The
// router must handle both, or Vitest reports them as unhandled rejections.
const startViewTransition = vi.fn((update: () => Promise<void>) => {
  const skipped = () => Promise.reject(new DOMException('Transition was skipped', 'AbortError'));
  return { finished: skipped(), ready: skipped(), updateCallbackDone: update() };
});
beforeAll(() => {
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition
  });
});

test('navigations run through a view transition whose skipped promises are handled', async () => {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: ['/inbox'] }),
    renderRoot: (page) => page
  });
  await router.load();
  startViewTransition.mockClear();
  await router.navigate({ to: '/issues/$issueId', params: { issueId: 'i1' } });
  expect(startViewTransition).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe('/issues/i1');
});

async function matched(path: string) {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
    renderRoot: (page) => page
  });
  await router.load();
  const leaf = router.state.matches.at(-1);
  return { params: leaf?.params, routeId: leaf?.routeId };
}

test.each([
  ['/', '/workspace/'],
  ['/trips', '/workspace/trips'],
  ['/trips/abc', '/workspace/trips/$tripId'],
  ['/trips/abc/plan', '/workspace/trips/$tripId/$section'],
  ['/trips/abc/ideas/xyz', '/workspace/trips/$tripId/ideas/$proposalId'],
  ['/trips/abc/ideas/xyz/packing', '/workspace/trips/$tripId/ideas/$proposalId/$view'],
  ['/trips/abc/research/r1', '/workspace/trips/$tripId/research/$researchId'],
  ['/chat', '/workspace/chat/'],
  ['/chat/d1', '/workspace/chat/$discussionId'],
  ['/settings/security', '/workspace/settings/$section'],
  ['/agents/a1/run1', '/workspace/agents/$agentId/$runId'],
  ['/agents/a1', '/workspace/agents/$agentId'],
  ['/inbox', '/workspace/inbox'],
  ['/ideas/p1', '/workspace/ideas/$proposalId'],
  ['/issues/i1', '/workspace/issues/$issueId'],
  ['/settings', '/workspace/settings']
])('%s renders inside the workspace layout', async (path, routeId) => {
  expect((await matched(path)).routeId).toBe(routeId);
});

test('decodes route params', async () => {
  expect((await matched('/trips/a%20b')).params).toEqual({ tripId: 'a b' });
});

test('an unknown path falls to the not-found page', async () => {
  expect((await matched('/nowhere/at/all')).routeId).toBe('__root__');
});

// Layouts and pages need Convex; stand them in so the test covers the tree's mounting only.
vi.mock('#pages/(workspace)/layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="workspace">{children}</div>
}));
vi.mock('#pages/(workspace)/chat/layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="chat">{children}</div>
}));
vi.mock('#pages/(workspace)/inbox', () => ({ default: () => <p>inbox page</p> }));
vi.mock('#pages/(workspace)/issue-detail', () => ({ default: () => <p>issue page</p> }));
vi.mock('#pages/(workspace)/chat-inbox', () => ({ default: () => <p>chat list page</p> }));
vi.mock('#pages/(workspace)/discussion-thread', () => ({ default: () => <p>thread page</p> }));

test('workspace and chat layouts keep their DOM node across sibling navigation', async () => {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: ['/chat'] }),
    renderRoot: (page) => page
  });
  const { container } = await render(<RouterProvider router={router} />);
  const find = async (id: string, text: string) => {
    await vi.waitFor(() => expect(container.textContent).toContain(text));
    return container.querySelector(`[data-testid="${id}"]`);
  };
  const workspace = await find('workspace', 'chat list page');
  const chat = container.querySelector('[data-testid="chat"]');
  expect(chat).not.toBeNull();

  await router.navigate({
    viewTransition: false,
    params: { discussionId: 'd1' },
    to: '/chat/$discussionId'
  });
  expect(await find('chat', 'thread page')).toBe(chat);
  expect(container.querySelector('[data-testid="workspace"]')).toBe(workspace);

  await router.navigate({ to: '/inbox' });
  expect(await find('workspace', 'inbox page')).toBe(workspace);
  expect(container.querySelector('[data-testid="chat"]')).toBeNull();

  await router.navigate({
    viewTransition: false,
    params: { issueId: 'i1' },
    to: '/issues/$issueId'
  });
  expect(await find('workspace', 'issue page')).toBe(workspace);
});

vi.mock('#pages/(workspace)/trip-section', () => ({ default: () => <p>trip section page</p> }));

test('a path nested past a page renders the not-found page, not the page', async () => {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: ['/trips/a/plan/extra'] }),
    renderRoot: (page) => page
  });
  const { container } = await render(<RouterProvider router={router} />);
  await vi.waitFor(() => expect(container.textContent).toContain('Page not found'));
  expect(container.textContent).not.toContain('trip section page');
});
