import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { Destination } from '@/types/trips';
import { EditorAddPlan } from './editor-add-plan';

afterEach(cleanup);

function stop(startDay: number | null, endDay: number | null): Destination {
  return {
    id: 'porto' as Id<'tripDestinations'>,
    name: 'Porto',
    startDay,
    endDay
  } as Destination;
}

test('starts on the first day with a scheduled destination instead of an empty day', () => {
  const onChoose = vi.fn();
  render(
    <EditorAddPlan dayCount={7} destinations={[stop(4, 5)]} onChoose={onChoose} onClose={vi.fn()} />
  );

  expect(screen.getByRole('combobox', { name: 'Day' }).textContent).toContain('Day 4');
  expect(screen.getByRole('combobox', { name: 'Destination' }).textContent).toContain('Porto');
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(onChoose).toHaveBeenCalledWith({
    day: 4,
    destinationId: 'porto',
    period: 'morning'
  });
});

test('allows an unscheduled destination to be planned on day one', () => {
  const onChoose = vi.fn();
  render(
    <EditorAddPlan
      dayCount={7}
      destinations={[stop(null, null)]}
      onChoose={onChoose}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(onChoose).toHaveBeenCalledWith({ day: 1, destinationId: 'porto', period: 'morning' });
});
