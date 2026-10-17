import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantRunCard } from './assistant-run-card';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>
}));

const tool = {
  input: {},
  output: {},
  state: 'output-available',
  toolCallId: 'call-1',
  type: 'tool-getTripStatus'
};

const prompt = { attachmentCount: 2, authorName: 'Ada', createdAt: 1, text: '@groam hotels?' };

function reply(partial: Partial<UIMessage> = {}): UIMessage {
  return {
    _creationTime: 2,
    id: 'a1',
    key: 'a1',
    order: 1,
    parts: [],
    role: 'assistant',
    status: 'success',
    stepOrder: 1,
    text: '',
    ...partial
  };
}

function position(first: string, second: string) {
  const a = page.getByText(first).element();
  const b = page.getByText(second).element();
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
}

test('embeds the prompt, the steps, then the reply in one card', async () => {
  await render(
    <AssistantRunCard
      prompt={prompt}
      replies={[reply({ parts: [tool] as unknown as UIMessage['parts'], text: 'Try Monti.' })]}
    />
  );
  await expect.element(page.getByText('Ada', { exact: true })).toBeVisible();
  await expect.element(page.getByText('2 attachments')).toBeVisible();
  await expect.element(page.getByText('Done', { exact: true })).toBeVisible();
  expect(position('@groam hotels?', 'Read trip status')).toBeTruthy();
  expect(position('Read trip status', 'Try Monti.')).toBeTruthy();
  await expect.element(page.getByText('Jan 1, 1970')).not.toBeVisible();
});

test('shows Groam working before any text arrives', async () => {
  await render(<AssistantRunCard prompt={prompt} replies={[reply({ status: 'streaming' })]} />);
  await expect.element(page.getByText('Groam is working')).toBeVisible();
  await expect.element(page.getByText('Running', { exact: true })).toBeVisible();
});

test('shows a run alone when its prompt is not loaded', async () => {
  await render(<AssistantRunCard replies={[reply({ text: 'Sure, Lisbon.' })]} />);
  await expect.element(page.getByText('Sure, Lisbon.')).toBeVisible();
  await expect.element(page.getByText('Ada')).not.toBeInTheDocument();
});

test('keeps the prompt message tools and reactions', async () => {
  await render(
    <AssistantRunCard
      actions={<button type="button">Message actions</button>}
      prompt={prompt}
      reactions={<span>❤️</span>}
      replies={[reply({ text: 'Ok' })]}
    />
  );
  await expect.element(page.getByRole('button', { name: 'Message actions' })).toBeInTheDocument();
  await expect.element(page.getByText('❤️')).toBeVisible();
});

test('formats the reply as markdown', async () => {
  await render(
    <AssistantRunCard replies={[reply({ text: '## Picks\n\n- **Monti**\n- Trastevere' })]} />
  );
  await expect.element(page.getByRole('heading', { name: 'Picks' })).toBeVisible();
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
  await expect.element(page.getByText('**Monti**')).not.toBeInTheDocument();
});
