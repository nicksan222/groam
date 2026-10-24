import { expect, test } from 'vite-plus/test';
import {
  addIsoDays,
  clickedPlanSlot,
  isoDaySpan,
  kloqView,
  planCalendarEvents,
  planCalendarSlot
} from './plan-calendar';

test('places timed plans on the wall clock and keeps them read-only', () => {
  const [museum] = planCalendarEvents([
    {
      id: 'museum',
      title: 'Tile museum',
      tone: 'activity',
      location: 'Lisbon',
      startDate: '2026-09-14',
      startTime: '10:00',
      endTime: '12:30'
    }
  ]);
  expect(museum).toEqual({
    id: 'museum',
    title: 'Tile museum',
    color: 'blue',
    readOnly: true,
    location: 'Lisbon',
    start: '2026-09-14T10:00:00',
    end: '2026-09-14T12:30:00'
  });
});

test('gives an open-ended plan an hour and carries a late end past midnight', () => {
  const [open, late] = planCalendarEvents([
    { id: 'a', title: 'Open', tone: 'activity', startDate: '2026-09-14', startTime: '23:30' },
    {
      id: 'b',
      title: 'Night bus',
      tone: 'travel',
      startDate: '2026-09-14',
      startTime: '22:00',
      endTime: '06:00'
    }
  ]);
  expect(open).toMatchObject({ start: '2026-09-14T23:30:00', end: '2026-09-15T00:30:00' });
  expect(late).toMatchObject({ color: 'amber', end: '2026-09-15T06:00:00' });
});

test('spans untimed plans across their days with an exclusive end', () => {
  const [stay] = planCalendarEvents([
    { id: 'hotel', title: 'Casa', tone: 'stay', startDate: '2026-09-14', endDate: '2026-09-16' }
  ]);
  expect(stay).toMatchObject({
    allDay: true,
    color: 'violet',
    start: '2026-09-14',
    end: '2026-09-17'
  });
});

test.each(['10:00', '23:30'])(
  'keeps an explicit multi-day end with an open arrival clock at %s',
  (startTime) => {
    const [event] = planCalendarEvents([
      {
        id: 'tour',
        title: 'Three-day tour',
        tone: 'activity',
        startDate: '2026-09-14',
        endDate: '2026-09-16',
        startTime
      }
    ]);
    expect(event).toMatchObject({
      start: `2026-09-14T${startTime}:00`,
      end: `2026-09-16T${startTime}:00`
    });
  }
);

test('fits the whole trip in day columns up to two weeks', () => {
  expect(kloqView('trip', 1)).toBe('day');
  expect(kloqView('trip', 5)).toBe(5);
  expect(kloqView('trip', 21)).toBe('week');
  expect(kloqView('month', 5)).toBe('month');
});

test('counts and steps calendar days across month ends', () => {
  expect(addIsoDays('2026-08-30', 3)).toBe('2026-09-02');
  expect(isoDaySpan('2026-08-30', '2026-09-02')).toBe(4);
});

test('a click plans an hour from its half hour; a drag keeps its exact span', () => {
  const at = (time: string) => new Date(`2026-09-14T${time}:00`);
  expect(clickedPlanSlot(at('11:45'), at('12:15'), false)).toEqual({
    startDate: '2026-09-14',
    endDate: '2026-09-14',
    startTime: '11:30',
    endTime: '12:30'
  });
  expect(clickedPlanSlot(at('23:40'), at('23:59'), false)).toEqual({
    startDate: '2026-09-14',
    endDate: '2026-09-15',
    startTime: '23:30',
    endTime: '00:00'
  });
  expect(planCalendarSlot(at('11:45'), at('13:00'), false)).toMatchObject({
    startTime: '11:45',
    endTime: '13:00'
  });
  expect(
    planCalendarSlot(new Date('2026-09-14T00:00:00'), new Date('2026-09-16T00:00:00'), true)
  ).toEqual({ startDate: '2026-09-14', endDate: '2026-09-15', startTime: null, endTime: null });
});
