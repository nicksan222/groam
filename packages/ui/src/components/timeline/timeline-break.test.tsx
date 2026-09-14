import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import Timeline from './index';

test('renders a dashed break between items', () => {
  const { container } = render(
    <Timeline>
      <Timeline.Item>Above</Timeline.Item>
      <Timeline.Break />
      <Timeline.Item>Below</Timeline.Item>
    </Timeline>
  );

  const separator = container.querySelector('[data-slot="timeline-break"]');
  expect(separator?.className).toContain('border-dashed');
});

test('minimal body matches the compact marker height', () => {
  const { container } = render(
    <Timeline variant="minimal">
      <Timeline.Item>
        <Timeline.Body>Content</Timeline.Body>
      </Timeline.Item>
    </Timeline>
  );
  const body = container.querySelector('[data-slot="timeline-body"]');

  expect(body?.className).toContain('min-h-5');
  expect(body?.className).toContain('py-0');
  expect(body?.getAttribute('data-variant')).toBe('minimal');
});

test('activity body aligns with the actor avatar', () => {
  const { container } = render(
    <Timeline variant="activity">
      <Timeline.Item>
        <Timeline.Body>Content</Timeline.Body>
      </Timeline.Item>
    </Timeline>
  );
  const body = container.querySelector('[data-slot="timeline-body"]');

  expect(body?.className).toContain('min-h-6');
  expect(body?.className).toContain('py-0');
  expect(body?.getAttribute('data-variant')).toBe('activity');
});
