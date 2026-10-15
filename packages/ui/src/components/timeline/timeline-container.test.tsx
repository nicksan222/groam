import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import Timeline from './index';

test('clipSidebar trims outer item padding via descendant selectors', async () => {
  const { container } = await render(
    <Timeline clipSidebar data-testid="timeline">
      <Timeline.Item>One</Timeline.Item>
      <Timeline.Item>Two</Timeline.Item>
    </Timeline>
  );
  const root = container.querySelector('[data-slot="timeline"]');

  expect(root?.getAttribute('data-clip-sidebar')).toBe('');
  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:pt-0');
  expect(root?.className).toContain('[&>[data-slot=timeline-item]:last-child]:pb-0');
  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:before:top-7');
});

test('forwards variant to the root data attribute', async () => {
  const { container } = await render(
    <Timeline variant="minimal">
      <Timeline.Item />
    </Timeline>
  );

  expect(container.querySelector('[data-slot="timeline"]')?.getAttribute('data-variant')).toBe(
    'minimal'
  );
});

test('clipSidebar starts the route rail at the 128px photo marker', async () => {
  const { container } = await render(
    <Timeline clipSidebar variant="route">
      <Timeline.Item>One</Timeline.Item>
      <Timeline.Item>Two</Timeline.Item>
    </Timeline>
  );
  const root = container.querySelector('[data-slot="timeline"]');

  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:before:top-32');
  expect(root?.getAttribute('data-variant')).toBe('route');
});

test('forwards the activity variant to the root data attribute', async () => {
  const { container } = await render(
    <Timeline variant="activity">
      <Timeline.Item />
    </Timeline>
  );

  expect(container.querySelector('[data-slot="timeline"]')?.getAttribute('data-variant')).toBe(
    'activity'
  );
});

test('clipSidebar starts the activity rail at the 24px actor avatar', async () => {
  const { container } = await render(
    <Timeline clipSidebar variant="activity">
      <Timeline.Item>One</Timeline.Item>
      <Timeline.Item>Two</Timeline.Item>
    </Timeline>
  );
  const root = container.querySelector('[data-slot="timeline"]');

  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:before:top-6');
  expect(root?.getAttribute('data-variant')).toBe('activity');
});
