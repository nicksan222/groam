import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchRun } from './research-run';

const activity = vi.hoisted(() => ({
  error: null as string | null,
  events: [] as Array<{ id: string; label: string }>,
  isActive: false,
  isLoading: false,
  isStarting: false,
  run: null as {
    id: string;
    status: 'running' | 'failed' | 'complete';
    headline: string;
    report: string | null;
    error?: string;
  } | null,
  start: vi.fn(),
  stop: vi.fn()
}));
vi.mock('@/features/research/hooks/use-research-run', () => ({ useResearchRun: () => activity }));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(activity, {
    error: null,
    events: [],
    isActive: false,
    isLoading: false,
    isStarting: false,
    run: null
  });
  activity.start.mockResolvedValue(true);
  activity.stop.mockResolvedValue(undefined);
});
const view = (writable = true) =>
  render(
    <ResearchRun
      discussionId={'research-1' as Id<'discussions'>}
      topic="Hotels in Rome"
      writable={writable}
    />
  );

test('starts research with the topic and selected effort', async () => {
  await view();
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic' }))
    .toHaveValue('Hotels in Rome');
  await page.getByRole('textbox', { name: 'Research topic' }).fill('Quiet hotels near the station');
  await page.getByRole('combobox', { name: 'Research effort' }).click();
  await page.getByRole('option', { name: 'Deep', exact: true }).click();
  await expect
    .element(page.getByText('Investigate more angles, sources, and open questions.'))
    .toBeVisible();
  await page.getByRole('button', { name: 'Research this topic' }).click();
  expect(activity.start).toHaveBeenCalledWith({
    effort: 'deep',
    topic: 'Quiet hotels near the station'
  });
});

test('uses standard effort by default and rejects empty topics', async () => {
  await view();
  await page.getByRole('button', { name: 'Research this topic' }).click();
  expect(activity.start).toHaveBeenCalledWith({ effort: 'standard', topic: 'Hotels in Rome' });
  await page.getByRole('textbox', { name: 'Research topic' }).fill('  ');
  await expect.element(page.getByRole('button', { name: 'Research this topic' })).toBeDisabled();
});

test('shows loading and prevents duplicate submissions', async () => {
  activity.isLoading = true;
  await view();
  await expect.element(page.getByRole('status')).toHaveTextContent('Loading research activity…');
  await expect.element(page.getByRole('button', { name: 'Research in progress…' })).toBeDisabled();
});

test('shows recorded progress and stops an active run', async () => {
  activity.isActive = true;
  activity.run = { id: 'run-1', status: 'running', headline: 'Investigating hotels', report: null };
  activity.events = [{ id: 'event-1', label: 'Comparing official hotel websites' }];
  await view();
  await expect.element(page.getByText('Comparing official hotel websites')).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Research topic' })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect(activity.stop).toHaveBeenCalledOnce();
});

test('renders a persisted report with a source link even when archived', async () => {
  activity.run = {
    id: 'run-1',
    status: 'complete',
    headline: 'Finished',
    report: '## Findings\n\nCompare the [official hotel website](https://example.com/hotel).'
  };
  await view(false);
  await expect.element(page.getByRole('article', { name: 'Research report' })).toBeVisible();
  await expect
    .element(page.getByRole('link', { name: 'official hotel website' }))
    .toHaveAttribute('href', 'https://example.com/hotel');
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic' }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Stop', exact: true }))
    .not.toBeInTheDocument();
});

test('retains the topic after a failed submission and offers a new attempt', async () => {
  activity.error = 'Connect ChatGPT before starting research.';
  await view();
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Connect ChatGPT before starting research.');
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic' }))
    .toHaveValue('Hotels in Rome');
  await expect.element(page.getByRole('button', { name: 'Research this topic' })).toBeEnabled();
});

test('leads with the completed report and keeps rerun drafts when collapsed', async () => {
  activity.run = {
    id: 'run-1',
    status: 'complete',
    headline: 'Finished',
    report: '## Findings\n\nThe report stays available while refining the next question.'
  };
  await view();
  await expect.element(page.getByRole('article', { name: 'Research report' })).toBeVisible();
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic', includeHidden: true }))
    .not.toBeVisible();
  await page.getByText('Research again', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Research topic' }).fill('Compare cancellation policies');
  await page.getByText('Research again', { exact: true }).click();
  await page.getByText('Research again', { exact: true }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic' }))
    .toHaveValue('Compare cancellation policies');
});
