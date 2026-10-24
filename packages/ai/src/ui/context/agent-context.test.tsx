import { render, renderHook } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  AgentContextProvider,
  type AgentScreenContext,
  useCurrentAgentContext,
  useCurrentAgentScreen,
  useSetAgentContext
} from './agent-context';

const overview: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain this overview.',
  key: 'trip:1:overview',
  title: 'Trip overview'
};

function PageView({ context }: { context: AgentScreenContext | null }) {
  useSetAgentContext(context);
  return null;
}

function ScreenProbe() {
  const screen = useCurrentAgentScreen();
  return (
    <>
      <output aria-label="Screen id">{screen ? screen.id : 'none'}</output>
      <output aria-label="Current agent context">
        {screen?.context ? JSON.stringify(screen.context) : 'none'}
      </output>
    </>
  );
}

const current = () =>
  page.getByRole('status', { name: 'Current agent context' }).element().textContent;
const screenId = () => page.getByRole('status', { name: 'Screen id' }).element().textContent;

function tree(...views: Array<[key: string, context: AgentScreenContext | null]>) {
  return (
    <AgentContextProvider>
      {views.map(([key, context]) => (
        <PageView context={context} key={key} />
      ))}
      <ScreenProbe />
    </AgentContextProvider>
  );
}

test('forwards the page’s data and follows changes to it', async () => {
  const view = await render(tree(['overview', overview]));
  expect(current()).toContain('"approvalCount":1');

  await view.rerender(tree(['overview', { ...overview, data: { approvalCount: 2 } }]));
  expect(current()).toContain('"approvalCount":2');
});

test('a loading page is the same screen once it loads, and a new page view is another', async () => {
  const view = await render(tree(['issue', null]));
  expect(current()).toBe('none');
  const loading = screenId();
  expect(loading).not.toBe('none');

  await view.rerender(tree(['issue', overview]));
  expect(current()).toContain('Trip overview');
  expect(screenId()).toBe(loading);

  await view.rerender(tree(['next', overview]));
  expect(screenId()).not.toBe(loading);
});

test('has no screen before a page view mounts, and none after it unmounts', async () => {
  const view = await render(tree());
  expect(screenId()).toBe('none');
  await view.rerender(tree(['overview', overview]));
  expect(screenId()).not.toBe('none');
  await view.rerender(tree());
  expect(screenId()).toBe('none');
  expect(current()).toBe('none');
});

test('the newest mounted view is current, and the previous one returns when it unmounts', async () => {
  const itinerary = { ...overview, key: 'trip:1:itinerary', title: 'Itinerary' };
  const view = await render(tree(['overview', overview], ['itinerary', itinerary]));
  expect(current()).toContain('Itinerary');

  await view.rerender(tree(['overview', overview]));
  expect(current()).toContain('Trip overview');
});

test('reads null context through useCurrentAgentContext', async () => {
  const { result } = await renderHook(() => useCurrentAgentContext(), {
    wrapper: ({ children }) => <AgentContextProvider>{children}</AgentContextProvider>
  });
  expect(result.current).toBeNull();
});

test('refuses to run outside the provider', async () => {
  await expect(renderHook(() => useSetAgentContext(overview))).rejects.toThrow(
    'useSetAgentContext must be used inside AgentContextProvider'
  );
  await expect(renderHook(() => useCurrentAgentScreen())).rejects.toThrow(
    'inside AgentContextProvider'
  );
});
