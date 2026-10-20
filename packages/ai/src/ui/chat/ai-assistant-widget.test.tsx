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
import { AiAssistantWidget } from './ai-assistant-widget';

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
      context: {
        catalog: { run: undefined as never, page: { run: undefined as never } },
        screen: { run: undefined as never }
      },
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
  createChat: vi.fn().mockResolvedValue('thread-2'),
  isOpening: false,
  isResponding: false,
  isSending: false,
  isStopping: false,
  loadMore: vi.fn(),
  messages: [],
  open: vi.fn(),
  selectThread: vi.fn(),
  send: vi.fn().mockResolvedValue(true),
  setTags: vi.fn().mockResolvedValue(true),
  status: 'Exhausted',
  stop: vi.fn().mockResolvedValue(true),
  threadId: 'thread-1' as string | null,
  unstableOpen: false
}));

vi.mock('#ai/ui/hooks/use-assistant', () => ({
  useAssistant: () => ({
    ...assistant,
    open: assistant.unstableOpen ? () => assistant.open() : assistant.open
  })
}));

vi.mock('#ai/ui/hooks/use-assistant-chats', () => ({
  toggleContextTagReferences: () => [],
  useAssistantChats: () => ({
    catalog: [],
    chats: [
      {
        contextKey: 'trip:trip-1',
        contextTitle: 'Portugal · Decisions',
        id: 'thread-1',
        tags: [],
        title: 'Portugal planning'
      }
    ],
    createChat: assistant.createChat,
    isCreating: false,
    isLoading: false,
    setTags: assistant.setTags,
    updatingThreadId: null
  })
}));

afterEach(() => {
  vi.clearAllMocks();
  assistant.canStop = false;
  assistant.isResponding = false;
  assistant.open.mockReset().mockResolvedValue(undefined);
  assistant.threadId = 'thread-1';
  assistant.unstableOpen = false;
});

// Between the mobile (768px) and docked (1280px) breakpoints the assistant opens as an overlay.
beforeEach(() => useViewport(1024, 800));

const context: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain the decision state shown here.',
  key: 'trip:trip-1:decisions',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
  title: 'Portugal · Decisions'
};

function ContextRegistration({ value = context }: { value?: AgentScreenContext }) {
  useSetAgentContext(value);
  return null;
}

async function renderWidget(withContext = true) {
  return render(
    <AgentContextProvider>
      {withContext && <ContextRegistration />}
      <AiAssistantWidget api={api} />
    </AgentContextProvider>
  );
}

describe('AiAssistantWidget', () => {
  test('uses registered screen context in one conversation', async () => {
    await renderWidget();
    await expect.element(page.getByRole('button', { name: 'Open Groam AI' })).toBeInTheDocument();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();

    const panel = page.getByRole('dialog', { name: 'Groam AI' }).element();
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
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).not.toBeInTheDocument();
  });

  test('keeps the wide-screen assistant dock nonmodal', async () => {
    await useViewport(1440, 900);
    await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await expect
      .element(page.getByRole('region', { name: 'Portugal planning' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).not.toBeInTheDocument();
  });

  test('preserves an unsent draft when the overlay becomes docked', async () => {
    await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await page.getByRole('textbox', { name: 'Assistant prompt' }).fill('draft resize check');
    await useViewport(1440, 900);
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .toHaveTextContent('draft resize check');
  });

  test('attempts automatic thread opening only once per panel opening', async () => {
    assistant.threadId = null;
    assistant.unstableOpen = true;
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await vi.waitFor(() => expect(assistant.open).toHaveBeenCalledTimes(1));

    await view.rerender(
      <AgentContextProvider>
        <ContextRegistration />
        <AiAssistantWidget api={api} />
      </AgentContextProvider>
    );
    expect(assistant.open).toHaveBeenCalledTimes(1);
  });

  test('shows a retry when opening fails and keeps suggestions disabled', async () => {
    assistant.threadId = null;
    assistant.open.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();

    await expect.element(page.getByText('Groam AI could not start.')).toBeInTheDocument();
    const suggestion = page.getByRole('button', { name: /status|attention|explain/i }).first();
    await expect.element(suggestion).toBeDisabled();

    await page.getByRole('button', { name: 'Retry' }).click();
    await vi.waitFor(() => expect(assistant.open).toHaveBeenCalledTimes(2));
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  test('toggles from the visible keyboard shortcut', async () => {
    await renderWidget();

    await userEvent.keyboard('{Control>}.{/Control}');
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).toBeInTheDocument();
    await userEvent.keyboard('{Control>}.{/Control}');
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).not.toBeInTheDocument();
  });

  test('closes when the registered page changes', async () => {
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).toBeInTheDocument();

    await view.rerender(
      <AgentContextProvider>
        <ContextRegistration
          value={{
            ...context,
            key: 'trip:trip-1:itinerary',
            target: { kind: 'trip', section: 'itinerary', tripId: 'trip-1' },
            title: 'Portugal · Itinerary'
          }}
        />
        <AiAssistantWidget api={api} />
      </AgentContextProvider>
    );

    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Open Groam AI' })).toBeInTheDocument();
  });

  test('can stop a streaming response from the composer', async () => {
    assistant.canStop = true;
    assistant.isResponding = true;
    await renderWidget();
    expect(
      page.getByRole('button', { name: 'Open Groam AI, response in progress' }).element()
    ).toBeDefined();
    await userEvent.click(
      page.getByRole('button', { name: 'Open Groam AI, response in progress' }).element()
    );

    await page.getByRole('button', { name: 'Stop response' }).click();
    expect(assistant.stop).toHaveBeenCalledTimes(1);
  });

  test('waits for a page to register context', async () => {
    await renderWidget(false);
    await page.getByRole('button', { name: 'Open Groam AI' }).click();

    await expect.element(page.getByText('No screen context registered')).toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .toHaveAttribute('contenteditable', 'false');
  });
});
