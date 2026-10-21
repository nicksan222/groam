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
        catalog: { run: undefined as never },
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
  // Records (page key, enabled) so tests can prove a closed page never enables useAssistant.
  observed: vi.fn(),
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
  useAssistant: (
    context: AgentScreenContext | null,
    _api: unknown,
    options: { enabled: boolean }
  ) => {
    assistant.observed(context?.key ?? null, options.enabled);
    return { ...assistant, open: assistant.unstableOpen ? () => assistant.open() : assistant.open };
  }
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

const nextPage: AgentScreenContext = { ...context, key: 'trip:trip-2:issues', title: 'Next trip' };

function openAssistant() {
  window.dispatchEvent(new Event('groam:open-assistant'));
}

function widgetTree(value: AgentScreenContext | null = context, showMobileLauncher = true) {
  return (
    <AgentContextProvider>
      {value && <ContextRegistration value={value} />}
      <button onClick={openAssistant} type="button">
        Ask AI
      </button>
      <AiAssistantWidget api={api} showMobileLauncher={showMobileLauncher} />
    </AgentContextProvider>
  );
}

async function renderWidget(value: AgentScreenContext | null = context) {
  return render(widgetTree(value));
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

    await view.rerender(widgetTree());
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
    await renderWidget(null);
    await page.getByRole('button', { name: 'Open Groam AI' }).click();

    await expect.element(page.getByText('No screen context registered')).toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'Assistant prompt' }))
      .toHaveAttribute('contenteditable', 'false');
  });

  test.each([1024, 1280])(
    'keeps an opening made before the first page context at width %s',
    async (width) => {
      await useViewport(width, 800);
      const panelRole = width >= 1280 ? 'region' : 'dialog';
      assistant.threadId = null;
      const view = await renderWidget(null);
      await page.getByRole('button', { name: 'Open Groam AI' }).click();
      await expect.element(page.getByRole(panelRole, { name: 'Groam AI' })).toBeVisible();
      expect(assistant.open).not.toHaveBeenCalled();
      await view.rerender(widgetTree());
      await expect.element(page.getByRole(panelRole, { name: 'Groam AI' })).toBeVisible();
      await vi.waitFor(() => expect(assistant.open).toHaveBeenCalledTimes(1));
    }
  );

  test('returns focus to the opener after opening before the page context resolves', async () => {
    await useViewport(390, 800);
    const view = await render(widgetTree(null, false));
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await view.rerender(widgetTree(context, false));
    await expect.element(page.getByText('How can I help?')).toBeVisible();
    await page.getByRole('button', { name: 'Close AI assistant' }).click();
    await expect.element(page.getByRole('button', { name: 'Ask AI' })).toHaveFocus();
  });

  test('a page change closes the panel without moving focus', async () => {
    await useViewport(1440, 900);
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await expect.element(page.getByRole('region', { name: 'Portugal planning' })).toBeVisible();
    page.getByRole('button', { name: 'Ask AI' }).element().focus();
    await view.rerender(widgetTree(nextPage));
    await expect.element(page.getByRole('button', { name: 'Open Groam AI' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Ask AI' })).toHaveFocus();
  });

  test('same-page context data updates keep the panel open without restarting the thread', async () => {
    assistant.threadId = null;
    const view = await renderWidget();
    await page.getByRole('button', { name: 'Open Groam AI' }).click();
    await vi.waitFor(() => expect(assistant.open).toHaveBeenCalledTimes(1));
    await view.rerender(widgetTree({ ...context, data: { approvalCount: 2 } }));
    await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).toBeVisible();
    expect(assistant.open).toHaveBeenCalledTimes(1);
  });

  test.each([
    { name: 'another page', before: [context], after: [nextPage] },
    { name: 'a missing-context gap', before: [context], after: [null, nextPage] },
    { name: 'a no-context page', before: [context, null], after: [nextPage] }
  ])(
    'leaving the opened page closes before the next page starts a thread: $name',
    async ({ after, before }) => {
      assistant.threadId = null;
      const [first = null, ...rest] = before;
      const view = await renderWidget(first);
      for (const value of rest) await view.rerender(widgetTree(value));
      await page.getByRole('button', { name: 'Open Groam AI' }).click();
      await expect.element(page.getByRole('dialog', { name: 'Groam AI' })).toBeVisible();
      for (const value of after) {
        await view.rerender(widgetTree(value));
        await expect
          .element(page.getByRole('dialog', { name: 'Groam AI' }))
          .not.toBeInTheDocument();
      }
      const nextObservations = assistant.observed.mock.calls.filter(
        ([key]) => key === nextPage.key
      );
      expect(nextObservations.length).toBeGreaterThan(0);
      expect(nextObservations.every(([, enabled]) => enabled === false)).toBe(true);
    }
  );
});
