import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import Timeline from './index';
import { TimelineItem } from './timeline-item';

test('timeline parts fall back to the default variant without a provider', () => {
  const { container } = render(
    <Timeline.Item>
      <Timeline.Badge>AB</Timeline.Badge>
      <Timeline.Body>Event</Timeline.Body>
    </Timeline.Item>
  );

  expect(container.querySelector('[data-slot="timeline-item"]')?.getAttribute('data-variant')).toBe(
    'default'
  );
  expect(
    container.querySelector('[data-slot="timeline-badge"]')?.getAttribute('data-variant')
  ).toBe('default');
  expect(container.querySelector('[data-slot="timeline-body"]')?.getAttribute('data-variant')).toBe(
    'default'
  );
});

test('keeps connector segments outside the avatar badge', () => {
  const { container } = render(<TimelineItem data-testid="item" />);
  const item = container.querySelector('[data-slot="timeline-item"]');

  expect(item?.className).toContain('before:top-9');
  expect(item?.className).toContain('after:h-2');
  expect(item?.className).toContain('first:after:hidden');
  expect(item?.className).toContain('last:before:hidden');
  expect(item?.className).not.toContain('before:top-0');
});

test('condensed default items use tighter vertical rhythm', () => {
  const { container } = render(
    <Timeline>
      <Timeline.Item condensed data-testid="item" />
    </Timeline>
  );
  const item = container.querySelector('[data-testid="item"]');

  expect(item?.className).toContain('py-1');
  expect(item?.getAttribute('data-condensed')).toBe('');
});

test('minimal variant uses a segmented hairline with markers between segments', () => {
  const { container } = render(
    <Timeline variant="minimal">
      <Timeline.Item data-testid="item" />
    </Timeline>
  );
  const item = container.querySelector('[data-testid="item"]');

  expect(item?.className).toContain('before:top-[1.875rem]');
  expect(item?.className).toContain('before:left-[9.5px]');
  expect(item?.className).toContain('after:h-2.5');
  expect(item?.className).toContain('first:after:hidden');
  expect(item?.className).toContain('last:before:hidden');
  expect(item?.className).toContain('only:before:hidden');
  expect(item?.className).not.toContain('before:inset-y-0');
  expect(item?.getAttribute('data-variant')).toBe('minimal');
  expect(item?.getAttribute('data-condensed')).toBe('');
});

test('activity variant uses a segmented hairline centered on the actor avatar', () => {
  const { container } = render(
    <Timeline variant="activity">
      <Timeline.Item data-testid="item" />
    </Timeline>
  );
  const item = container.querySelector('[data-testid="item"]');

  expect(item?.className).toContain('before:top-8');
  expect(item?.className).toContain('before:left-[11.5px]');
  expect(item?.className).toContain('after:h-2');
  expect(item?.className).toContain('py-2');
  expect(item?.className).toContain('first:after:hidden');
  expect(item?.className).toContain('last:before:hidden');
  expect(item?.className).toContain('only:before:hidden');
  expect(item?.className).not.toContain('before:inset-y-0');
  expect(item?.className).not.toContain('before:left-[9.5px]');
  expect(item?.getAttribute('data-variant')).toBe('activity');
  expect(item?.getAttribute('data-condensed')).toBeNull();
});

test('activity condensed items tighten padding and keep the hairline on the badge', () => {
  const { container } = render(
    <Timeline variant="activity">
      <Timeline.Item condensed data-testid="item" />
    </Timeline>
  );
  const classes = container.querySelector('[data-testid="item"]')?.className.split(/\s+/) ?? [];

  expect(classes).toContain('py-1.5');
  expect(classes).toContain('before:top-[1.875rem]');
  expect(classes).toContain('after:h-1.5');
  expect(classes).not.toContain('py-1');
  expect(classes).not.toContain('py-2.5');
  expect(container.querySelector('[data-testid="item"]')?.getAttribute('data-condensed')).toBe('');
});

test('route variant uses a segmented hairline centered on the 128px photo marker', () => {
  const { container } = render(
    <Timeline variant="route">
      <Timeline.Item data-testid="item" />
    </Timeline>
  );
  const item = container.querySelector('[data-testid="item"]');

  expect(item?.className).toContain('before:top-36');
  expect(item?.className).toContain('before:left-20');
  expect(item?.className).toContain('after:h-4');
  expect(item?.className).toContain('after:left-20');
  expect(item?.className).toContain('first:after:hidden');
  expect(item?.className).toContain('last:before:hidden');
  expect(item?.className).not.toContain('before:top-9');
  expect(item?.getAttribute('data-variant')).toBe('route');
});
