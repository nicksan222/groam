import { describe, expect, test } from 'vitest';
import { destinationTakenDays } from './destination-taken-days';

describe('destinationTakenDays', () => {
  test('marks sibling ranges as taken while allowing same-day handoffs', () => {
    const destinations = [
      { endDay: 3, id: 'lisbon', startDay: 1 },
      { endDay: 7, id: 'porto', startDay: 3 }
    ] as const;

    expect([...destinationTakenDays(destinations, 'lisbon', 1, 3)]).toEqual([4, 5, 6, 7]);
    expect([...destinationTakenDays(destinations, 'porto', 3, 7)]).toEqual([1, 2]);
    expect([...destinationTakenDays(destinations, 'lisbon', 1, 7)]).toEqual([4, 5, 6, 7]);
  });

  test('marks Lisbon and Montreal when editing a later stop', () => {
    const destinations = [
      { endDay: 2, id: 'lisbon', startDay: 1 },
      { endDay: 4, id: 'montreal', startDay: 3 },
      { endDay: 7, id: 'porto', startDay: 5 }
    ] as const;

    expect([...destinationTakenDays(destinations, 'montreal', 2, 5)]).toEqual([1, 6, 7]);
    expect([...destinationTakenDays(destinations, 'porto', 4, 8)]).toEqual([1, 2, 3]);
  });

  test('keeps same-day handoffs open for adjacent stops', () => {
    const destinations = [
      { endDay: 2, id: 'lisbon', startDay: 1 },
      { endDay: 4, id: 'montreal', startDay: 3 }
    ] as const;

    expect([...destinationTakenDays(destinations, 'montreal', 2, 8)]).toEqual([1]);
    expect([...destinationTakenDays(destinations, 'lisbon', 1, 3)]).toEqual([4]);
  });
});
