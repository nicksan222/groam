import { cleanup, render, screen } from '@testing-library/react';
import { MapPinned } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { MetricTiles } from './metric-tiles';

afterEach(cleanup);

test('renders compact metric tiles with short and long labels', () => {
  render(
    <MetricTiles
      items={[
        { icon: MapPinned, label: 'Trips', longLabel: 'Active trips', value: 7 },
        { label: 'Settled', value: 3 }
      ]}
    />
  );

  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.getByText('Active trips')).toBeTruthy();
  expect(screen.getByText('Trips')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getAllByText('Settled')).toHaveLength(2);
});
