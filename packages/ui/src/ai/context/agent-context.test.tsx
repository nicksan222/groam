import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
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

afterEach(cleanup);

test('forwards registered page data and reacts to structural context updates', () => {
  const view = render(
    <AgentContextProvider>
      <Registration context={overview} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Current agent context' }).textContent).toContain(
    'approvalCount'
  );

  view.rerender(
    <AgentContextProvider>
      <Registration context={{ ...overview, data: { approvalCount: 2 } }} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Current agent context' }).textContent).toContain(
    '"approvalCount":2'
  );
});

test('restores the parent context when a more specific registration unmounts', () => {
  const view = render(
    <AgentContextProvider>
      <Registration context={overview} />
      <Registration context={{ ...overview, key: 'trip:1:itinerary', title: 'Itinerary' }} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Current agent context' }).textContent).toContain(
    'Itinerary'
  );

  view.rerender(
    <AgentContextProvider>
      <Registration context={overview} />
      <ContextProbe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Current agent context' }).textContent).toContain(
    'Trip overview'
  );
});
