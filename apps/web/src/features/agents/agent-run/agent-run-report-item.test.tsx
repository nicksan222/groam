import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRunReportItem as Item } from '@/types/agents';
import { AgentRunReportItem } from './agent-run-report-item';

function item(overrides: Partial<Item> = {}): Item {
  return { fields: [], segments: [{ type: 'text', value: 'Plain text' }], ...overrides };
}

function renderItem(value: Item) {
  return render(
    <ul>
      <AgentRunReportItem item={value} />
    </ul>
  );
}

describe('AgentRunReportItem', () => {
  test.each([
    ['text', 'Plain text', 'SPAN'],
    ['emphasis', 'Loud', 'STRONG'],
    ['money', '$1,200', 'SPAN'],
    ['id', 'abc123', 'CODE']
  ] as const)('renders a %s segment', async (type, value, tag) => {
    await renderItem(item({ segments: [{ type, value }] }));
    const el = page.getByText(value);
    await expect.element(el).toBeVisible();
    expect(el.element().tagName).toBe(tag);
  });

  test('renders segments in order', async () => {
    await renderItem(
      item({
        segments: [
          { type: 'text', value: 'Moved' },
          { type: 'emphasis', value: 'Lisbon' },
          { type: 'text', value: 'to June' }
        ]
      })
    );
    expect(page.getByRole('listitem').first().element().textContent).toBe('MovedLisbonto June');
  });

  test('shows no field badges without fields', async () => {
    await renderItem(item());
    expect(page.getByRole('listitem').elements().length).toBe(1);
  });

  test('shows field labels with ids or the raw value', async () => {
    await renderItem(
      item({
        fields: [
          { ids: ['a1'], label: 'Trip', raw: 'a1' },
          { ids: [], label: 'Note', raw: 'raw-value' }
        ]
      })
    );
    await expect.element(page.getByText('Trip')).toBeVisible();
    await expect.element(page.getByText('a1')).toBeVisible();
    await expect.element(page.getByText('raw-value')).toBeVisible();
  });

  test('shows a count when a field has several ids', async () => {
    await renderItem(item({ fields: [{ ids: ['a', 'b', 'c'], label: 'Days', raw: 'a b c' }] }));
    await expect.element(page.getByText('3')).toBeVisible();
    await expect.element(page.getByText('a, b, c')).toBeInTheDocument();
  });
});
