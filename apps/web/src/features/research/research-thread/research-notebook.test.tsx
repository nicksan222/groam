import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionMessage } from '@/types/discussions';
import { ResearchNotebook } from './research-notebook';

const state = vi.hoisted(() => ({
  canStop: false,
  isStopping: false,
  loadMore: vi.fn(),
  messages: [] as DiscussionMessage[],
  send: vi.fn(),
  status: 'Exhausted',
  stop: vi.fn()
}));
vi.mock('@/features/research/hooks/use-save-research-note', () => ({
  useSaveResearchNote: () => state.send
}));
vi.mock('@/features/discussions/hooks/use-discussion-thread', () => ({
  useDiscussionThread: () => state
}));
const note = (text: string, role: 'assistant' | 'user', time: number) =>
  ({
    _creationTime: time,
    author: { name: 'Ada', userId: 'ada' },
    id: text,
    key: text,
    order: time,
    parts: [{ type: 'text', text }],
    role,
    status: 'success',
    stepOrder: 0,
    text
  }) as DiscussionMessage;
const view = (writable = true) =>
  render(
    <ResearchNotebook
      discussionId={'r1' as Id<'discussions'>}
      threadId="thread1"
      writable={writable}
    />
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.messages = [];
  state.status = 'Exhausted';
  state.send.mockResolvedValue(true);
});

test('starts with a purposeful notebook empty state and an explicit note editor', async () => {
  await view();
  await expect
    .element(page.getByRole('heading', { name: 'Start with what you know' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('textbox', { name: 'Research note' }))
    .not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Add the first note' }).click();
  await page.getByRole('textbox', { name: 'Research note' }).fill('A hotel source');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  expect(state.send).toHaveBeenCalledWith({ text: 'A hotel source' });
});

test('reads recent contributions first as articles with Markdown and attribution', async () => {
  state.messages = [note('An older note', 'user', 1), note('**Latest finding**', 'assistant', 2)];
  await view();
  expect(page.getByRole('article').elements()[0]?.textContent).toContain('Latest finding');
  await expect.element(page.getByText('AI note', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Ada', { exact: true })).toBeVisible();
  expect(page.getByText('Latest finding').element().getAttribute('data-streamdown')).toBe('strong');
});

test('loads earlier notes and prevents writing on archived research', async () => {
  state.status = 'CanLoadMore';
  await view(false);
  await page.getByRole('button', { name: 'Load earlier notes' }).click();
  expect(state.loadMore).toHaveBeenCalledWith(30);
  await expect.element(page.getByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  await expect.element(page.getByText('This trip is archived')).toBeVisible();
});

test('keeps long source links inside the notebook on phones', async () => {
  await useViewport(390, 844);
  state.messages = [
    note(`A useful source: https://example.com/${'research'.repeat(40)}`, 'user', 1)
  ];
  await view();
  await expect.element(page.getByRole('article')).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});

test('retains a note draft after a failed save and closes without losing it', async () => {
  state.send.mockResolvedValueOnce(false);
  await view();
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Research note' }).fill('An unsaved finding');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research note' }))
    .toHaveValue('An unsaved finding');
  await page.getByRole('button', { name: 'Close editor' }).click();
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research note' }))
    .toHaveValue('An unsaved finding');
});
