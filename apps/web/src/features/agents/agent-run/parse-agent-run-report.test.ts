import { describe, expect, test } from 'vitest';
import { parseAgentRunReport } from './parse-agent-run-report';

const destinationA = 'jh7abcdefghijklmnopqrstuvwxyz012';
const destinationB = 'jh7abcdefghijklmnopqrstuvwxyz013';
const activityId = 'jh7abcdefghijklmnopqrstuvwxyz014';

describe('parseAgentRunReport', () => {
  test('splits applied and attempted itinerary sections and de-emphasizes ids', () => {
    const parsed = parseAgentRunReport(`Changes made to the draft itinerary:
- Added **Lisbon museum** (activityId: ${activityId} cost: €24)
- Linked destinationIds: ["${destinationA}", "${destinationB}"]

Attempted but not applied:
- Could not add the funicular — sold out
`);

    expect(parsed.lead).toEqual([]);
    expect(parsed.sections.map((section) => [section.tone, section.title])).toEqual([
      ['applied', 'Changes made to the draft itinerary'],
      ['attempted', 'Attempted but not applied']
    ]);

    const [museum, destinations] = parsed.sections[0]?.items ?? [];
    expect(
      museum?.segments.some(
        (segment) => segment.type === 'emphasis' && segment.value === 'Lisbon museum'
      )
    ).toBe(true);
    expect(museum?.fields.map((field) => field.label)).toEqual(['Activity', 'Cost']);
    expect(museum?.fields[0]?.ids).toEqual([activityId]);
    expect(museum?.fields[1]?.raw).toBe('€24');
    expect(destinations?.fields[0]).toMatchObject({
      ids: [destinationA, destinationB],
      label: 'Destinations'
    });
    expect(parsed.sections[1]?.items[0]?.segments.some((segment) => segment.type === 'text')).toBe(
      true
    );
    expect(
      parsed.sections[1]?.items[0]?.segments.map((segment) => segment.value).join('')
    ).toContain('Could not add the funicular');
  });

  test('keeps a short report as lead copy without inventing sections', () => {
    const parsed = parseAgentRunReport('Opened a draft idea.');
    expect(parsed.sections).toEqual([]);
    expect(parsed.lead[0]?.segments).toEqual([{ type: 'text', value: 'Opened a draft idea.' }]);
  });
});
