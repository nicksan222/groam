import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  AgentContextProvider,
  type AgentScreenContext,
  useCurrentAgentContext,
  useSetAgentContext
} from './agent-context';

const overview: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain this overview.',
  key: 'trip:1:overview',
  title: 'Trip overview'
};

function Registration({ context }: { context: AgentScreenContext | null }) {
  useSetAgentContext(context);
  return null;
}

function ContextProbe() {
  const context = useCurrentAgentContext();
  return (
    <output aria-label="Current agent context">{context ? JSON.stringify(context) : 'none'}</output>
  );
}

test('forwards registered page data and reacts to structural context updates', async () => {
  const view = await render(
    <AgentContextProvider>
      <Registration context={overview} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(
    page.getByRole('status', { name: 'Current agent context' }).element().textContent
  ).toContain('approvalCount');

  await view.rerender(
    <AgentContextProvider>
      <Registration context={{ ...overview, data: { approvalCount: 2 } }} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(
    page.getByRole('status', { name: 'Current agent context' }).element().textContent
  ).toContain('"approvalCount":2');
});

test('restores the parent context when a more specific registration unmounts', async () => {
  const view = await render(
    <AgentContextProvider>
      <Registration context={overview} />
      <Registration context={{ ...overview, key: 'trip:1:itinerary', title: 'Itinerary' }} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(
    page.getByRole('status', { name: 'Current agent context' }).element().textContent
  ).toContain('Itinerary');

  await view.rerender(
    <AgentContextProvider>
      <Registration context={overview} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(
    page.getByRole('status', { name: 'Current agent context' }).element().textContent
  ).toContain('Trip overview');
});
