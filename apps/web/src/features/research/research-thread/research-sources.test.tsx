import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchSources } from './research-sources';
import { researchSources, researchSourceUrl } from './research-sources-utils';

const state = vi.hoisted(() => ({
  report: '' as string,
  messages: [] as { text: string }[],
  send: vi.fn(),
  loadMore: vi.fn(),
  status: 'Exhausted',
  isSending: false,
  isResponding: false
}));
vi.mock('@/features/research/hooks/use-latest-research-run', () => ({
  useLatestResearchRun: () => ({ report: state.report })
}));
vi.mock('@/features/research/hooks/use-save-research-note', () => ({
  useSaveResearchNote: () => state.send
}));
vi.mock('@/features/discussions/hooks/use-discussion-thread', () => ({
  useDiscussionThread: () => state
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.messages = [];
  state.report = '';
  state.status = 'Exhausted';
  state.isSending = false;
  state.isResponding = false;
  state.send.mockReset().mockResolvedValue(true);
});
const view = (writable = true) =>
  render(
    <ResearchSources discussionId={'d1' as Id<'discussions'>} threadId="t1" writable={writable} />
  );

test('extracts and deduplicates actual Markdown and plain URLs', () => {
  expect(
    researchSources([
      { text: '[Read more](https://EXAMPLE.com/guide#section). https://example.com/guide' },
      { text: 'https://example.org/Paris_(city) and <https://example.net/?q=hotels>.' },
      { text: '[Unsafe](javascript:alert(1)) https://user:secret@example.com/' }
    ])
  ).toEqual([
    { host: 'example.com', href: 'https://example.com/guide', path: '/guide' },
    { host: 'example.org', href: 'https://example.org/Paris_(city)', path: '/Paris_(city)' },
    { host: 'example.net', href: 'https://example.net/?q=hotels', path: '?q=hotels' }
  ]);
  expect(researchSourceUrl('javascript:alert(1)')).toBeNull();
  expect(researchSourceUrl('file:///tmp/trip')).toBeNull();
  expect(researchSourceUrl('example.com')).toBeNull();
});

test('shows real source hosts and paths as safe external links', async () => {
  state.messages = [{ text: 'Try https://example.com/guide and https://example.com/guide' }];
  await view();
  const link = page.getByRole('link', { name: 'example.com /guide Open source in a new tab' });
  await expect.element(link).toBeVisible();
  expect(link.element().getAttribute('href')).toBe('https://example.com/guide');
  expect(link.element().getAttribute('rel')).toBe('noopener noreferrer');
  expect(page.getByRole('link').all()).toHaveLength(1);
  expect(state.send).not.toHaveBeenCalled();
});

test('validates URL input and retains a source after unsuccessful submission', async () => {
  state.send.mockResolvedValueOnce(false);
  await view();
  const input = page.getByRole('textbox', { name: 'Source URL' });
  await input.fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Enter a full URL starting with https:// or http://.');
  expect(state.send).not.toHaveBeenCalled();
  await input.fill('https://example.com/guide');
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect.element(input).toHaveValue('https://example.com/guide');
  expect(state.send).toHaveBeenCalledWith({ text: 'https://example.com/guide' });
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect.element(input).toHaveValue('');
});

test('disables source entry while submission is pending', async () => {
  let finish: (success: boolean) => void = () => undefined;
  state.send.mockReturnValue(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    })
  );
  await view();
  await page.getByRole('textbox', { name: 'Source URL' }).fill('https://example.com');
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect.element(page.getByRole('textbox', { name: 'Source URL' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  finish(true);
  await expect.element(page.getByRole('button', { name: 'Add source' })).toBeVisible();
});

test('offers earlier notes and an honest empty state without write controls when archived', async () => {
  state.status = 'CanLoadMore';
  await view(false);
  await expect.element(page.getByText('No sources yet.', { exact: false })).toBeVisible();
  await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Look through earlier notes' }).click();
  expect(state.loadMore).toHaveBeenCalledWith(30);
});

test('includes cited report sources and deduplicates them against notes', async () => {
  state.report = '[Official](https://example.com/guide) [Museum](https://museum.example/visit)';
  state.messages = [{ text: 'https://example.com/guide' }];
  await view();
  expect(page.getByRole('link').all()).toHaveLength(2);
  await expect
    .element(page.getByRole('link', { name: 'museum.example /visit Open source in a new tab' }))
    .toBeVisible();
});

test('deduplicates citation tracking links without discarding meaningful query parameters', () => {
  expect(
    researchSources([
      {
        text: 'https://example.com/guide?q=hotels https://example.com/guide?q=hotels&utm_source=openai&utm_campaign=research https://example.com/guide?q=trains'
      }
    ])
  ).toEqual([
    { host: 'example.com', href: 'https://example.com/guide?q=hotels', path: '/guide?q=hotels' },
    { host: 'example.com', href: 'https://example.com/guide?q=trains', path: '/guide?q=trains' }
  ]);
});
