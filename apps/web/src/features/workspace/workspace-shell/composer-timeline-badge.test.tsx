import Timeline from '@groam/ui/components/timeline';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vite-plus/test';
import { ComposerTimelineBadge } from './composer-timeline-badge';
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-state';

async function renderBadge(badge: ReactNode) {
  return render(
    <Timeline>
      <Timeline.Item>{badge}</Timeline.Item>
    </Timeline>
  );
}

test('reads the signed-in viewer from workspace when no name is passed', async () => {
  const { container } = await renderBadge(
    <WorkspaceContext.Provider
      value={{ session: { user: { name: 'Alex Morgan' } } } as WorkspaceContextValue}
    >
      <ComposerTimelineBadge />
    </WorkspaceContext.Provider>
  );

  expect(container.querySelector('[data-slot="timeline-badge"]')?.textContent).toBe('AM');
});

test('prefers an explicit name over the signed-in viewer', async () => {
  const { container } = await renderBadge(
    <WorkspaceContext.Provider
      value={{ session: { user: { name: 'Alex Morgan' } } } as WorkspaceContextValue}
    >
      <ComposerTimelineBadge name="Lea Demo" />
    </WorkspaceContext.Provider>
  );

  expect(container.querySelector('[data-slot="timeline-badge"]')?.textContent).toBe('LD');
});
