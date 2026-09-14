import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { testIds } from '@/lib/test-ids';
import { AgentRunReport } from './agent-run-report';

afterEach(cleanup);

const activityId = 'jh7abcdefghijklmnopqrstuvwxyz014';

describe('AgentRunReport', () => {
  test('renders structured cards instead of a raw pre-wrap dump', () => {
    render(
      <AgentRunReport
        report={`Changes made to the draft itinerary:
- Added a rainy-day museum (activityId: ${activityId} cost: €24)

Attempted but not applied:
- Could not add the funicular
`}
      />
    );

    expect(screen.getByTestId(testIds.agentRunReport)).toBeTruthy();
    expect(screen.getByText('On the draft')).toBeTruthy();
    expect(screen.getByText('Not applied')).toBeTruthy();
    expect(screen.getByText(/rainy-day museum/u)).toBeTruthy();
    expect(screen.getByText('€24')).toBeTruthy();
    expect(screen.getByText('Could not add the funicular')).toBeTruthy();
    expect(screen.getAllByTestId(testIds.agentRunReportSection)).toHaveLength(2);
    expect(document.querySelector('p.whitespace-pre-wrap')).toBeNull();
  });
});
