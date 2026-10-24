import { expect, test } from 'vite-plus/test';
import { researchReportSummary } from './research-report';

test('leads with the recommendation and the report caveat', () => {
  expect(
    researchReportSummary(
      [
        '> Demo fixture. Prices were',
        '> not checked.',
        '',
        '## Stays in Oaxaca',
        '### Recommendation',
        'Keep the plan flexible.',
        '',
        'More detail.',
        '### Options',
        '- **Quiet first:** a residential street.'
      ].join('\n')
    )
  ).toEqual({
    answer: 'Keep the plan flexible.',
    caveat: 'Demo fixture. Prices were not checked.'
  });
});

test('accepts answer and summary headings and tolerates reports without one', () => {
  expect(researchReportSummary('## Answer\nTake the train.').answer).toBe('Take the train.');
  expect(researchReportSummary('# Summary\n\nBook early.').answer).toBe('Book early.');
  expect(researchReportSummary('Just some findings.')).toEqual({ answer: null, caveat: null });
  expect(researchReportSummary(null)).toEqual({ answer: null, caveat: null });
});
