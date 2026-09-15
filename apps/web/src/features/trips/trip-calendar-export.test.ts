import { describe, expect, test } from 'vitest';
import { tripCalendarIcs } from './trip-calendar-export';

describe('tripCalendarIcs', () => {
  test('returns null without a start date or events', () => {
    expect(tripCalendarIcs({ destinations: [], name: 'Summer', startDate: null })).toBeNull();
    expect(
      tripCalendarIcs({
        destinations: [
          {
            activities: [],
            endDay: null,
            name: 'Lisbon',
            startDay: null
          } as never
        ],
        name: 'Summer',
        startDate: '2027-05-10'
      })
    ).toBeNull();
  });

  test('emits all-day events for stops and activities', () => {
    const ics = tripCalendarIcs(
      {
        destinations: [
          {
            activities: [
              {
                dayNumber: 2,
                endDayNumber: 2,
                id: 'activity-1',
                title: 'Museum'
              }
            ],
            endDay: 3,
            id: 'destination-1',
            name: 'Lisbon',
            startDay: 1
          } as never
        ],
        name: 'Portugal',
        startDate: '2027-05-10'
      },
      new Date('2026-09-02T00:00:00.000Z')
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('UID:groam-destination-destination-1@groam.local');
    expect(ics).toContain('UID:groam-activity-activity-1@groam.local');
    expect(ics).toContain('DTSTAMP:20260902T000000Z');
    expect(ics).toContain('SUMMARY:Portugal · Lisbon');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270510');
    expect(ics).toContain('DTEND;VALUE=DATE:20270513');
    expect(ics).toContain('SUMMARY:Lisbon · Museum');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270511');
    expect(ics).toContain('DTEND;VALUE=DATE:20270512');
  });

  test('escapes CR so a title cannot inject extra ICS properties', () => {
    const ics = tripCalendarIcs({
      destinations: [
        {
          activities: [],
          endDay: 1,
          id: 'destination-1',
          name: 'Lisbon\r\nDESCRIPTION:injected',
          startDay: 1
        } as never
      ],
      name: 'Portugal',
      startDate: '2027-05-10'
    });
    expect(ics).toContain('SUMMARY:Portugal · Lisbon\\nDESCRIPTION:injected');
    expect(ics).not.toMatch(/^DESCRIPTION:injected$/mu);
  });

  test('folds long SUMMARY lines at 75 octets', () => {
    const longName = 'A'.repeat(80);
    const ics = tripCalendarIcs({
      destinations: [
        {
          activities: [],
          endDay: 1,
          id: 'destination-1',
          name: longName,
          startDay: 1
        } as never
      ],
      name: 'Portugal',
      startDate: '2027-05-10'
    });
    expect(ics).toMatch(/SUMMARY:Portugal · A+\r\n A+/u);
    expect(ics?.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true
    );
  });

  test('folds emoji titles on Unicode code-point boundaries', () => {
    const ics = tripCalendarIcs({
      destinations: [
        {
          activities: [],
          endDay: 1,
          id: 'destination-1',
          name: `${'A'.repeat(50)}🎉🎉🎉🎉🎉`,
          startDay: 1
        } as never
      ],
      name: 'Portugal',
      startDate: '2027-05-10'
    });
    const encoded = new TextEncoder().encode(ics ?? '');
    expect(new TextDecoder().decode(encoded)).toBe(ics);
    expect(ics?.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true
    );
  });
});
