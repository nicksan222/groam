import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import Timeline from './index';

test('default badge uses the square marker track', () => {
  const { container } = render(
    <Timeline>
      <Timeline.Item>
        <Timeline.Badge>1</Timeline.Badge>
      </Timeline.Item>
    </Timeline>
  );
  const badge = container.querySelector('[data-slot="timeline-badge"]');

  expect(badge?.className).toContain('h-7');
  expect(badge?.className).toContain('rounded-lg');
  expect(badge?.className).toContain('border-border');
  expect(badge?.className).toContain('bg-muted/50');
  expect(badge?.className).toContain('text-foreground');
  expect(badge?.className).not.toContain('bg-primary');
  expect(badge?.className).not.toContain('border-primary');
  expect(badge?.getAttribute('data-variant')).toBe('default');
});

test('minimal badge uses the circular marker track', () => {
  const { container } = render(
    <Timeline variant="minimal">
      <Timeline.Item>
        <Timeline.Badge>1</Timeline.Badge>
      </Timeline.Item>
    </Timeline>
  );
  const badge = container.querySelector('[data-slot="timeline-badge"]');

  expect(badge?.className).toContain('h-5');
  expect(badge?.className).toContain('rounded-full');
  expect(badge?.className).toContain('text-[10px]');
  expect(badge?.className).toContain('tabular-nums');
  expect(badge?.className).toContain('bg-muted/40');
  expect(badge?.getAttribute('data-variant')).toBe('minimal');
});

test('activity badge uses a compact circular avatar', () => {
  const { container } = render(
    <Timeline variant="activity">
      <Timeline.Item>
        <Timeline.Badge>GD</Timeline.Badge>
      </Timeline.Item>
    </Timeline>
  );
  const badge = container.querySelector('[data-slot="timeline-badge"]');

  expect(badge?.className).toContain('h-6');
  expect(badge?.className).toContain('w-6');
  expect(badge?.className).toContain('rounded-full');
  expect(badge?.className).toContain('text-[10px]');
  expect(badge?.className).toContain('bg-muted');
  expect(badge?.className).toContain('border-border');
  expect(badge?.className).toContain('text-foreground');
  expect(badge?.className).not.toContain('bg-primary');
  expect(badge?.className).not.toContain('h-8');
  expect(badge?.getAttribute('data-variant')).toBe('activity');
});

test('route badge uses a postcard photo marker', () => {
  const { container } = render(
    <Timeline variant="route">
      <Timeline.Item>
        <Timeline.Badge>1</Timeline.Badge>
      </Timeline.Item>
    </Timeline>
  );
  const badge = container.querySelector('[data-slot="timeline-badge"]');

  expect(badge?.className).toContain('h-32');
  expect(badge?.className).toContain('w-40');
  expect(badge?.className).toContain('rounded-xl');
  expect(badge?.className).toContain('bg-muted');
  expect(badge?.className).toContain('p-0');
  expect(badge?.getAttribute('data-variant')).toBe('route');
});
