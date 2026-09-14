import { describe, expect, test, vi } from 'vitest';
import { nextStepFor } from './trip-overview-next-step';

describe('nextStepFor', () => {
  test('asks for a destination first', () => {
    const onAddDestination = vi.fn();
    const step = nextStepFor({
      hasDestination: false,
      hasDuration: false,
      hasTravelWindow: false,
      onAddDestination,
      onEditDetails: vi.fn(),
      onOpenItinerary: vi.fn()
    });
    expect(step.title).toBe('Choose where this trip begins');
    step.onClick();
    expect(onAddDestination).toHaveBeenCalled();
  });

  test('progresses through window, length, then itinerary', () => {
    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: false,
        hasTravelWindow: false,
        onAddDestination: vi.fn(),
        onEditDetails: vi.fn(),
        onOpenItinerary: vi.fn()
      }).action
    ).toBe('Add travel window');

    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: false,
        hasTravelWindow: true,
        onAddDestination: vi.fn(),
        onEditDetails: vi.fn(),
        onOpenItinerary: vi.fn()
      }).action
    ).toBe('Set trip length');

    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: true,
        hasTravelWindow: true,
        onAddDestination: vi.fn(),
        onEditDetails: vi.fn(),
        onOpenItinerary: vi.fn()
      }).action
    ).toBe('Build the itinerary');
  });
});
