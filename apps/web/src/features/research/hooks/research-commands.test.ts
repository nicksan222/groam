import { expect, test, vi } from 'vite-plus/test';
import type { ResearchDetail } from '@/types/research';
import { researchCommands } from './research-commands';

const research = (partial: Partial<ResearchDetail> = {}): ResearchDetail => ({
  brief: null,
  canManage: false,
  id: 'r1',
  links: [],
  shortId: 'r1',
  title: 'Hotels',
  tripId: 't1',
  ...partial
});

const handlers = () => ({
  onLink: vi.fn(),
  onSaveBrief: vi.fn(),
  onSummarize: vi.fn(),
  onUnlink: vi.fn()
});

test('offers summarize and link to everyone', () => {
  const names = researchCommands({ ...handlers(), linkOptions: [], research: research() }).map(
    (command) => command.name
  );
  expect(names).toEqual(['summarize', 'link']);
});

test('adds unlink with links and brief for managers', () => {
  const link = {
    createdAt: 1,
    createdByName: 'Ada',
    href: null,
    id: 'l1',
    label: 'Book flights',
    target: { id: 'i1', kind: 'issue' as const }
  };
  const callbacks = handlers();
  const commands = researchCommands({
    ...callbacks,
    linkOptions: [{ group: 'Ideas', label: 'Pisa', target: { id: 'd1', kind: 'idea' } }],
    research: research({ canManage: true, links: [link] })
  });
  expect(commands.map((command) => command.name)).toEqual(['summarize', 'link', 'unlink', 'brief']);
  const [option] = commands[1]?.options?.('pis') ?? [];
  void option?.run();
  expect(callbacks.onLink).toHaveBeenCalledWith(expect.objectContaining({ label: 'Pisa' }));
  void commands[2]?.options?.('book')[0]?.run();
  expect(callbacks.onUnlink).toHaveBeenCalledWith(link);
});
