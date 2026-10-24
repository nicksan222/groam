import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AgentRunReport } from './agent-run-report';

const activityId = 'jh7abcdefghijklmnopqrstuvwxyz014';

describe('AgentRunReport', () => {
  test('preserves research Markdown as a document, including tables and source links', async () => {
    await render(
      <AgentRunReport
        report={`## Direct answer

**Keep the walk optional.** Split into small groups and **check holiday hours.**

## Options

| Option | Trade-off |
| --- | --- |
| Independent café | Flexible timing |

- Choose a short route
  - Check accessibility

> Seating is not guaranteed.

[Official hours](https://example.com/hours)
`}
      />
    );

    await expect.element(page.getByRole('heading', { name: 'Direct answer' })).toBeVisible();
    await expect.element(page.getByRole('table')).toBeVisible();
    await expect.element(page.getByRole('cell', { name: 'Independent café' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Official hours' }))
      .toHaveAttribute('href', 'https://example.com/hours');
    expect(document.querySelector('[data-streamdown="strong"]')?.textContent).toBe(
      'Keep the walk optional.'
    );
    expect(document.querySelector('li li')?.textContent).toContain('Check accessibility');
    expect(document.querySelector('blockquote')?.textContent).toContain(
      'Seating is not guaranteed.'
    );
    expect(page.getByTestId(testIds.agentRunReportSection).elements()).toHaveLength(0);
    await expect.element(page.getByText('Nothing listed.')).not.toBeInTheDocument();
  });

  test('renders structured cards instead of a raw pre-wrap dump', async () => {
    await render(
      <AgentRunReport
        report={`Changes made to the draft itinerary:
- Added a rainy-day museum (activityId: ${activityId} cost: €24)

Attempted but not applied:
- Could not add the funicular
`}
      />
    );

    await expect.element(page.getByTestId(testIds.agentRunReport)).toBeInTheDocument();
    await expect.element(page.getByText('On the draft')).toBeInTheDocument();
    await expect.element(page.getByText('Not applied')).toBeInTheDocument();
    await expect.element(page.getByText(/rainy-day museum/u)).toBeInTheDocument();
    await expect.element(page.getByText('€24')).toBeInTheDocument();
    await expect.element(page.getByText('Could not add the funicular')).toBeInTheDocument();
    expect(page.getByTestId(testIds.agentRunReportSection).elements()).toHaveLength(2);
    expect(document.querySelector('p.whitespace-pre-wrap')).toBeNull();
  });
});
