import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, test } from 'vitest';
import { ChangeSummary } from './change-summary';

afterEach(cleanup);
const changes: ComponentProps<typeof ChangeSummary>['changes'] = [
  {
    change: 'modified',
    entity: 'activity',
    key: 'museum',
    label: 'Museum visit',
    fields: [
      {
        key: 'notes',
        label: 'Notes',
        display: 'value',
        format: 'text',
        before: 'Early visit',
        after: 'Afternoon visit',
        mediaBefore: [],
        mediaAfter: []
      },
      {
        key: 'attachments',
        label: 'Attachments',
        display: 'media',
        format: null,
        before: null,
        after: null,
        mediaBefore: [],
        mediaAfter: []
      }
    ]
  },
  {
    change: 'removed',
    entity: 'activity',
    key: 'lunch',
    label: 'Lunch booking',
    fields: [
      {
        key: 'title',
        label: 'Activity',
        display: 'value',
        format: 'text',
        before: 'Lunch booking',
        after: null,
        mediaBefore: [],
        mediaAfter: []
      }
    ]
  }
];
test('supports scanning, collapsing, and reopening changes without hiding removals', () => {
  render(<ChangeSummary changes={changes} status="draft" />);
  expect(screen.queryByText('Attachments')).toBeNull();
  expect(screen.getByText('Afternoon visit')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  expect(
    screen.getByRole('button', { name: 'Expand Museum visit' }).getAttribute('aria-expanded')
  ).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Expand Museum visit' }));
  expect(
    screen.getByRole('button', { name: 'Collapse Museum visit' }).getAttribute('aria-expanded')
  ).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(
    screen.getByRole('button', { name: 'Collapse Lunch booking' }).getAttribute('aria-expanded')
  ).toBe('true');
  expect(screen.getAllByText('Lunch booking').length).toBeGreaterThan(1);
});
