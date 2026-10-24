import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { AgentRunReportSection as Section } from '@/types/agents';
import { AgentRunReportSection } from './agent-run-report-section';

function section(overrides: Partial<Section> = {}): Section {
  return {
    items: [{ fields: [], segments: [{ type: 'text', value: 'Added a day' }] }],
    title: 'Changes',
    tone: 'applied',
    ...overrides
  };
}

describe('AgentRunReportSection', () => {
  test.each([
    ['applied', 'On the draft'],
    ['attempted', 'Not applied'],
    ['neutral', 'Notes']
  ] as const)('shows the %s tone badge', async (tone, badge) => {
    await render(<AgentRunReportSection section={section({ tone })} />);
    await expect.element(page.getByTestId(testIds.agentRunReportSection)).toBeVisible();
    await expect.element(page.getByText('Changes')).toBeVisible();
    await expect.element(page.getByText(badge)).toBeVisible();
  });

  test('lists every item', async () => {
    await render(
      <AgentRunReportSection
        section={section({
          items: [
            { fields: [], segments: [{ type: 'text', value: 'First' }] },
            { fields: [], segments: [{ type: 'text', value: 'Second' }] }
          ]
        })}
      />
    );
    await expect.element(page.getByText('First')).toBeVisible();
    await expect.element(page.getByText('Second')).toBeVisible();
    await expect.element(page.getByText('Nothing listed.')).not.toBeInTheDocument();
  });

  test('says so when the section has no items', async () => {
    await render(<AgentRunReportSection section={section({ items: [] })} />);
    await expect.element(page.getByText('Nothing listed.')).toBeVisible();
  });
});
