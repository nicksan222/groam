import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition } from '@/types/issues';
import { IssueConditionSection } from './issue-condition-section';

const unmetAuto = {
  check: 'destination',
  kind: 'auto',
  label: 'The trip has a destination',
  met: false,
  refusal: 'Closes once the trip has a destination.'
} satisfies IssueCondition;
const metAuto = { ...unmetAuto, met: true } satisfies IssueCondition;
const manual = { kind: 'manual', label: 'Flights confirmed', met: null } satisfies IssueCondition;

describe('IssueConditionSection', () => {
  test('renders nothing without a condition', async () => {
    await render(<IssueConditionSection condition={null} />);
    await expect.element(page.getByText('Done when')).not.toBeInTheDocument();
  });

  test.each<[string, IssueCondition, string, string | null]>([
    ['an unmet auto condition', unmetAuto, 'Not met yet', 'false'],
    ['a met auto condition', metAuto, 'Met. It stays Done', 'true'],
    ['a manual condition', manual, '', null]
  ])('shows %s', async (_, condition, hint, met) => {
    await render(<IssueConditionSection condition={condition} />);
    await expect.element(page.getByText('Done when')).toBeVisible();
    await expect.element(page.getByText(condition.label)).toBeVisible();
    const panel = page.getByTestId(testIds.issueConditionPanel);
    if (met === null) await expect.element(panel).not.toHaveAttribute('data-met');
    else await expect.element(panel).toHaveAttribute('data-met', met);
    if (hint) await expect.element(page.getByText(hint, { exact: false })).toBeVisible();
    else await expect.element(panel.getByText(/Met\.|Not met/u)).not.toBeInTheDocument();
  });
});
