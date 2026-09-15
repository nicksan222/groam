import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MapPin } from 'lucide-react';
import { afterEach, expect, test, vi } from 'vitest';
import { SelectRow } from './select-row';

afterEach(cleanup);

test('renders a selectable row and reports selection', () => {
  const onSelect = vi.fn();

  render(
    <SelectRow
      icon={<MapPin />}
      onSelect={onSelect}
      selected
      subtitle="City · Portugal"
      title="Lisbon"
    />
  );

  expect(screen.getByText('Lisbon')).toBeTruthy();
  expect(screen.getByText('City · Portugal')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Lisbon/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});
