import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { StatStrip } from './stat-strip';

test('renders metric items with labels and values', () => {
  render(
    <StatStrip columns={3}>
      <StatStrip.Item label="Stops" value={4} />
      <StatStrip.Item label="Trip days" value="—" />
    </StatStrip>
  );

  expect(screen.getByText('Stops')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.getByText('Trip days')).toBeTruthy();
  expect(screen.getByText('—')).toBeTruthy();
});
