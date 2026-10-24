import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { ChatInboxView } from './chat-inbox-view';

const state = vi.hoisted(() => ({
  context: vi.fn(),
  discussions: [] as DiscussionListItem[]
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: (context: unknown) => state.context(context)
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-1', name: 'Acme Labs' } })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: state.discussions, isLoading: false })
}));

beforeEach(() => {
  state.context.mockClear();
  state.discussions = [];
});

test('invites the viewer to pick a chat and tells Groam AI about the group’s chats', async () => {
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: { authorName: 'Ada', text: 'Airport rides?' },
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
      title: 'Italy dates'
    } as DiscussionListItem
  ];
  await render(<ChatInboxView />);
  await expect.element(page.getByText('Pick a chat or start one.')).toBeVisible();
  expect(state.context).toHaveBeenLastCalledWith({
    capabilities: [],
    data: {
      discussionCount: 1,
      discussions: [
        { id: 'discussion-1', lastMessage: 'Airport rides?', memberCount: 1, title: 'Italy dates' }
      ],
      groupName: 'Acme Labs'
    },
    description: expect.any(String),
    key: 'chat:inbox',
    title: 'Acme Labs · Chat'
  });
});
