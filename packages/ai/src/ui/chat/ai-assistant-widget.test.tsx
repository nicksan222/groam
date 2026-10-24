import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import {
  AgentContextProvider,
  type AgentScreenContext,
  useSetAgentContext
} from '#ai/ui/context/agent-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';
import { AiAssistantWidget, OPEN_ASSISTANT_EVENT } from './ai-assistant-widget';

// The hooks are mocked above, so the api object is never touched. The stub
// only satisfies the widget's prop type.
const api: AssistantBackendApi = {
  routes: {
    assistant: {
      chats: {
        create: { run: undefined as never },
        list: { run: undefined as never },
        tags: { run: undefined as never }
      },
      context: { catalog: { run: undefined as never } },
      messages: { run: undefined as never },
      open: { run: undefined as never },
      resend: { run: undefined as never },
      send: { run: undefined as never },
      stop: { run: undefined as never }
    }
  }
};

const assistant = vi.hoisted(() => ({
  canStop: false,
  chatsLoading: false,
  createChat: vi.fn().mockResolvedValue('thread-2'),
  isLoading: false,
  isResponding: false,
  isSending: false,
  isStopping: false,
  loadMore: vi.fn(),
  messages: [],
  // Records the page key and the chats each useAssistant call reads.
  observed: vi.fn(),
  selectThread: vi.fn(),
  send: vi.fn().mockResolvedValue(true),
  setTags: vi.fn().mockResolvedValue(true),
  status: 'Exhausted',
  stop: vi.fn().mockResolvedValue(true),
  threadId: 'thread-1' as string | null
}));

vi.mock('#ai/ui/hooks/use-assistant', () => ({
  useAssistant: (context: AgentScreenContext | null, _api: unknown, chats: unknown) => {
    assistant.observed(context?.key ?? null, chats);
    return assistant;
  }
}));

const chatList = [
  {
    contextKey: 'trip:trip-1',
    id: 'thread-1',
    status: 'active',
    tags: [],
    title: 'Portugal planning'
  }
];

vi.mock('#ai/ui/hooks/use-assistant-chats', () => ({
  toggleContextTagReferences: () => [],
  useAssistantChats: () => ({
    catalog: [],
    chats: assistant.chatsLoading ? [] : chatList,
    createChat: assistant.createChat,
    isCreating: false,
    isLoading: assistant.chatsLoading,
    setTags: assistant.setTags,
    updatingThreadId: null
  })
}));

afterEach(() => {
  vi.clearAllMocks();
  assistant.canStop = false;
  assistant.chatsLoading = false;
  assistant.isLoading = false;
  assistant.isResponding = false;
  assistant.threadId = 'thread-1';
});

// The assistant always opens as a drawer overlay.
beforeEach(() => useViewport(1024, 800));

const context: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain the decision state shown here.',
  key: 'trip:trip-1:decisions',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
  title: 'Portugal · Decisions'
};

const nextPage: AgentScreenContext = {
  ...context,
  key: 'trip:trip-2:issues',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-2' },
  title: 'Next trip'
};

/** A page view: `view` names the mounted view, `value` is what it registers (null while loading). */
type Screen = { value: AgentScreenContext | null; view: string };

function PageView({ value }: { value: AgentScreenContext | null }) {
  useSetAgentContext(value);
  return null;
}

function openAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}

function widgetTree(screen: Screen | null = { value: context, view: 'decisions' }) {
  return (
    <AgentContextProvider>
      {screen && <PageView key={screen.view} value={screen.value} />}
      <button onClick={openAssistant} type="button">
        Ask AI
      </button>
      <AiAssistantWidget api={api} />
    </AgentContextProvider>
  );
}

async function renderWidget(screen?: Screen | null) {
  return render(widgetTree(screen));
}

const dialog = () => page.getByRole('dialog', { name: 'Groam AI' });

describe('AiAssistantWidget', () => {
  test('uses registered screen context in one conversation', async () => {
    await renderWidget();
    await expect.element(page.getByRole('button', { name: 'Ask AI' })).toBeInTheDocument();
    await page.getByRole('button', { name: 'Ask AI' }).click();

    const panel = dialog().element();
    expect(panel.getAttribute('data-slot')).toBe('sheet-content');
    expect(page.getByText('Portugal · Decisions').elements()).toHaveLength(1);
    await expect.element(page.getByText('How can I help?')).toBeInTheDocument();
    await expect
      .element(page.getByText('Explain the decision state shown here.'))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Attach trip context' }))
      .toBeInTheDocument();
    await page.getByRole('button', { name: 'Start new AI chat' }).click();
    await vi.waitFor(() => expect(assistant.selectThread).toHaveBeenCalledWith('thread-2'));
    const composer = page.getByRole('textbox', { name: 'Assistant prompt' }).element();
    await userEvent.fill(composer, 'What still needs attention?');
    await page.getByRole('button', { name: 'Submit prompt' }).click();
    await vi.waitFor(() =>
      expect(assistant.send).toHaveBeenCalledWith('What still needs attention?')
    );

    panel.focus();

    await userEvent.keyboard('{Escape}');
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  test('reads the page’s conversation before the panel opens', async () => {
    assistant.chatsLoading = true;
    const view = await renderWidget();
    expect(assistant.observed).toHaveBeenLastCalledWith(context.key, undefined);

    assistant.chatsLoading = false;
    await view.rerender(widgetTree());
    expect(assistant.observed).toHaveBeenLastCalledWith(context.key, chatList);
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  test('sends from a page with no conversation yet; the first message starts it', async () => {
    assistant.threadId = null;
    await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();

    const suggestion = page.getByRole('button', { name: /status|attention|explain/i }).first();
    await expect.element(suggestion).toBeEnabled();
    const composer = page.getByRole('textbox', { name: 'Assistant prompt' }).element();
    await userEvent.fill(composer, 'Where do we start?');
    await page.getByRole('button', { name: 'Submit prompt' }).click();
    await vi.waitFor(() => expect(assistant.send).toHaveBeenCalledWith('Where do we start?'));
  });

  test('connects instead of offering a send while the conversation loads', async () => {
    assistant.isLoading = true;
    await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .toHaveAttribute('contenteditable', 'false');
  });

  test('toggles from the visible keyboard shortcut', async () => {
    await renderWidget();

    await userEvent.keyboard('{Control>}.{/Control}');
    await expect.element(dialog()).toBeInTheDocument();
    await userEvent.keyboard('{Control>}.{/Control}');
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  test('can stop a streaming response from the composer', async () => {
    assistant.canStop = true;
    assistant.isResponding = true;
    await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();

    await page.getByRole('button', { name: 'Stop response' }).click();
    expect(assistant.stop).toHaveBeenCalledTimes(1);
  });

  test('waits for a page that is still loading what it shows', async () => {
    await renderWidget({ value: null, view: 'issue' });
    await page.getByRole('button', { name: 'Ask AI' }).click();

    await expect.element(page.getByText('Waiting for this page')).toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .toHaveAttribute('contenteditable', 'false');
  });

  test('stays open while the page it was opened on finishes loading', async () => {
    const view = await renderWidget({ value: null, view: 'issue' });
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect.element(dialog()).toBeVisible();

    await view.rerender(widgetTree({ value: context, view: 'issue' }));
    await expect.element(dialog()).toBeVisible();
    await expect.element(page.getByText('How can I help?')).toBeVisible();
  });

  test.each([1024, 1440])(
    'keeps an opening made before any page view mounted, at width %s',
    async (width) => {
      await useViewport(width, 800);
      const view = await renderWidget(null);
      await page.getByRole('button', { name: 'Ask AI' }).click();
      await expect.element(dialog()).toBeVisible();
      await view.rerender(widgetTree());
      await expect.element(dialog()).toBeVisible();
      await expect.element(page.getByText('How can I help?')).toBeVisible();
    }
  );

  test('returns focus to the opener after opening before the page context resolves', async () => {
    await useViewport(390, 800);
    const view = await render(widgetTree(null));
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await view.rerender(widgetTree());
    await expect.element(page.getByText('How can I help?')).toBeVisible();
    await page.getByRole('button', { name: 'Close AI assistant' }).click();
    await expect.element(page.getByRole('button', { name: 'Ask AI' })).toHaveFocus();
  });

  test('returns focus to what was focused when the shortcut opened it', async () => {
    await renderWidget();
    page.getByRole('button', { name: 'Ask AI' }).element().focus();
    await userEvent.keyboard('{Control>}.{/Control}');
    await expect.element(dialog()).toBeVisible();
    await page.getByRole('button', { name: 'Close AI assistant' }).click();
    await expect.element(page.getByRole('button', { name: 'Ask AI' })).toHaveFocus();
  });

  test('same-page context data updates keep the panel open', async () => {
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await view.rerender(
      widgetTree({ value: { ...context, data: { approvalCount: 2 } }, view: 'decisions' })
    );
    await expect.element(dialog()).toBeVisible();
  });

  test.each<{ after: Array<Screen | null>; name: string }>([
    { after: [{ value: nextPage, view: 'next' }], name: 'another page view' },
    { after: [{ value: nextPage, view: 'decisions' }], name: 'the same view on another page' },
    {
      after: [
        { value: null, view: 'next' },
        { value: nextPage, view: 'next' }
      ],
      name: 'a next page that is still loading'
    },
    { after: [null], name: 'a page view that unmounts' }
  ])('leaving the page closes the panel: $name', async ({ after }) => {
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect.element(dialog()).toBeVisible();
    for (const screen of after) {
      await view.rerender(widgetTree(screen));
      await expect.element(dialog()).not.toBeInTheDocument();
    }
  });

  test('keeps the typed message when the first send of a new conversation fails', async () => {
    assistant.threadId = null;
    assistant.send.mockImplementationOnce(async () => {
      // The thread starts, then sending to it fails.
      assistant.threadId = 'thread-new';
      return false;
    });
    await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    const composer = page.getByRole('textbox', { name: 'Assistant prompt' });
    await userEvent.fill(composer.element(), 'Plan day 2');
    await page.getByRole('button', { name: 'Submit prompt' }).click();
    await vi.waitFor(() => expect(assistant.send).toHaveBeenCalledWith('Plan day 2'));
    await expect.element(composer).toHaveTextContent('Plan day 2');
  });

  test('another conversation on the same view starts with an empty draft', async () => {
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await userEvent.fill(
      page.getByRole('textbox', { name: 'Assistant prompt' }).element(),
      'Half typed'
    );
    await view.rerender(widgetTree({ value: nextPage, view: 'decisions' }));
    await expect.element(dialog()).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .not.toHaveTextContent('Half typed');
  });
});
