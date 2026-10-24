import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { VisualDiffField } from './proposal-types';
import { VisualValue } from './visual-value';

type Format = VisualDiffField['format'];

describe('VisualValue', () => {
  test.each<[string, Format, unknown, string]>([
    ['null', 'text', null, 'Not set'],
    ['undefined', 'text', undefined, 'Not set'],
    ['empty string', 'text', '', 'Not set'],
    ['true', 'text', true, 'Yes'],
    ['false', 'text', false, 'No'],
    ['string', 'text', 'Hello', 'Hello'],
    ['number', 'text', 42, '42'],
    ['empty array', 'text', [], 'None'],
    ['array', 'text', ['a', 'b'], 'a, b'],
    ['object', 'text', { timeBlock: 'morning' }, 'Time Block: morning'],
    ['money', 'money', { amount: 1500 }, (1500).toLocaleString()],
    ['duration', 'duration', { minutes: 45 }, '45 min'],
    ['travel mode', 'travelMode', 'public_transit', 'Public transit'],
    ['undecided destination', 'destination', { status: 'undecided' }, 'Undecided']
  ])('formats %s', async (_, format, value, expected) => {
    await render(<VisualValue format={format} value={value} />);
    await expect.element(page.getByText(expected, { exact: true })).toBeVisible();
  });
});
