import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AgentRunReport } from './agent-run-report';

const activityId = 'jh7abcdefghijklmnopqrstuvwxyz014';

describe('AgentRunReport', () => {
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
