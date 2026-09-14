import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import Timeline from './index';

test('clipSidebar trims outer item padding via descendant selectors', () => {
  const { container } = render(
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

test('forwards variant to the root data attribute', () => {
  const { container } = render(
    <Timeline variant="minimal">
      <Timeline.Item />
    </Timeline>
  );

  expect(container.querySelector('[data-slot="timeline"]')?.getAttribute('data-variant')).toBe(
    'minimal'
  );
});

test('clipSidebar starts the route rail at the 128px photo marker', () => {
  const { container } = render(
    <Timeline clipSidebar variant="route">
      <Timeline.Item>One</Timeline.Item>
      <Timeline.Item>Two</Timeline.Item>
    </Timeline>
  );
  const root = container.querySelector('[data-slot="timeline"]');

  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:before:top-32');
  expect(root?.getAttribute('data-variant')).toBe('route');
});

test('forwards the activity variant to the root data attribute', () => {
  const { container } = render(
    <Timeline variant="activity">
      <Timeline.Item />
    </Timeline>
  );

  expect(container.querySelector('[data-slot="timeline"]')?.getAttribute('data-variant')).toBe(
    'activity'
  );
});

test('clipSidebar starts the activity rail at the 24px actor avatar', () => {
  const { container } = render(
    <Timeline clipSidebar variant="activity">
      <Timeline.Item>One</Timeline.Item>
      <Timeline.Item>Two</Timeline.Item>
    </Timeline>
  );
  const root = container.querySelector('[data-slot="timeline"]');

  expect(root?.className).toContain('[&>[data-slot=timeline-item]:first-child]:before:top-6');
  expect(root?.getAttribute('data-variant')).toBe('activity');
});
