import Timeline from '@groam/ui/components/timeline';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vite-plus/test';
import { ComposerTimelineBadge } from './composer-timeline-badge';

async function renderBadge(badge: ReactNode) {
  return render(
    <Timeline>
      <Timeline.Item>{badge}</Timeline.Item>
    </Timeline>
  );
}

function badgeEl(container: HTMLElement) {
  return container.querySelector('[data-slot="timeline-badge"]');
}

test('shows the viewer initials when a name is provided', async () => {
  const { container } = await renderBadge(<ComposerTimelineBadge name="Lea Demo" />);
  const badge = badgeEl(container);

  expect(badge?.textContent).toBe('LD');
  expect(badge?.querySelector('svg')).toBeNull();
  expect(badge?.className).toContain('rounded-full');
  expect(badge?.className).toContain('p-0');
  expect(badge?.className).toContain('h-6');
  expect(badge?.className).toContain('w-6');
});

test('falls back to a message icon when the viewer is unknown', async () => {
  const { container } = await renderBadge(<ComposerTimelineBadge />);
  const badge = badgeEl(container);

  expect(badge?.textContent).toBe('');
  expect(badge?.querySelector('svg')).toBeTruthy();
  expect(badge?.className).toContain('rounded-full');
  expect(badge?.className).toContain('bg-muted');
  expect(badge?.className).toContain('text-muted-foreground');
});
