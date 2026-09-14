import Timeline from '@groam/ui/components/timeline';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test } from 'vitest';
import { ComposerTimelineBadge } from './composer-timeline-badge';
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-state';

afterEach(cleanup);

function renderBadge(badge: ReactNode) {
  return render(
    <Timeline>
      <Timeline.Item>{badge}</Timeline.Item>
    </Timeline>
  );
}

test('reads the signed-in viewer from workspace when no name is passed', () => {
  const { container } = renderBadge(
    <WorkspaceContext.Provider
      value={{ session: { user: { name: 'Alex Morgan' } } } as WorkspaceContextValue}
    >
      <ComposerTimelineBadge />
    </WorkspaceContext.Provider>
  );

  expect(container.querySelector('[data-slot="timeline-badge"]')?.textContent).toBe('AM');
});

test('prefers an explicit name over the signed-in viewer', () => {
  const { container } = renderBadge(
    <WorkspaceContext.Provider
      value={{ session: { user: { name: 'Alex Morgan' } } } as WorkspaceContextValue}
    >
      <ComposerTimelineBadge name="Lea Demo" />
    </WorkspaceContext.Provider>
  );

  expect(container.querySelector('[data-slot="timeline-badge"]')?.textContent).toBe('LD');
});
