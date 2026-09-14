import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { StackedAvatar } from './stacked-avatar';

afterEach(cleanup);

test('renders a single face', () => {
  const { container } = render(
    <StackedAvatar faces={[{ alt: 'Alex Morgan', fallback: 'AM', src: '/alex.jpg' }]} size="md" />
  );

  expect(screen.getByText('AM')).toBeTruthy();
  expect(container.firstElementChild?.className).toContain('size-12');
});

test('stacks two faces with overlapping frames', () => {
  const { container } = render(
    <StackedAvatar
      faces={[
        { alt: 'Alex Morgan', fallback: 'AM' },
        { alt: 'Sam Planner', fallback: 'SP' }
      ]}
      size="sm"
    />
  );

  expect(screen.getByText('AM')).toBeTruthy();
  expect(screen.getByText('SP')).toBeTruthy();
  expect(container.firstElementChild?.className).toContain('size-9');
});
