import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AgentContextProvider,
  type AgentScreenContext,
  useSetAgentContext
} from '#tsx/ai/context/agent-context';
import { AiAssistantWidget } from './ai-assistant-widget';

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

vi.mock('#src/ai/hooks/use-assistant', () => ({
  useAssistant: () => ({
    ...assistant,
    open: assistant.unstableOpen ? () => assistant.open() : assistant.open
  })
}));

vi.mock('#src/ai/hooks/use-assistant-chats', () => ({
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
  cleanup();
  vi.clearAllMocks();
  assistant.canStop = false;
  assistant.isResponding = false;
  assistant.open.mockReset().mockResolvedValue(undefined);
  assistant.threadId = 'thread-1';
  assistant.unstableOpen = false;
});

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

const context: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain the decision state shown here.',
  key: 'trip:trip-1:decisions',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-1' as never },
  title: 'Portugal · Decisions'
};

function ContextRegistration({ value = context }: { value?: AgentScreenContext }) {
  useSetAgentContext(value);
  return null;
}

function renderWidget(withContext = true) {
  return render(
    <AgentContextProvider>
      {withContext && <ContextRegistration />}
      <AiAssistantWidget />
    </AgentContextProvider>
  );
}

describe('AiAssistantWidget', () => {
  test('uses registered screen context in one conversation', async () => {
    renderWidget();
    expect(screen.getByRole('button', { name: 'Open Groam AI' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Open Groam AI' }));

    const panel = screen.getByRole('region', { name: 'Groam AI' });
    expect(screen.getAllByText('Portugal · Decisions')).toHaveLength(1);
    expect(screen.getByText('How can I help?')).toBeDefined();
    expect(screen.getByText('Explain the decision state shown here.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Attach trip context' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Start new AI chat' }));
    await waitFor(() => expect(assistant.selectThread).toHaveBeenCalledWith('thread-2'));
    const composer = screen.getByRole('textbox', { name: 'Assistant prompt' });
    fireEvent.change(composer, {
      target: { value: 'What still needs attention?' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit prompt' }));
    await waitFor(() => expect(assistant.send).toHaveBeenCalledWith('What still needs attention?'));

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Groam AI' })).toBeNull();
  });

  test('attempts automatic thread opening only once per panel opening', async () => {
    assistant.threadId = null;
    assistant.unstableOpen = true;
    const view = renderWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Open Groam AI' }));
    await waitFor(() => expect(assistant.open).toHaveBeenCalledTimes(1));

    view.rerender(
      <AgentContextProvider>
        <ContextRegistration />
        <AiAssistantWidget />
      </AgentContextProvider>
    );
    expect(assistant.open).toHaveBeenCalledTimes(1);
  });

  test('toggles from the visible keyboard shortcut', () => {
    renderWidget();

    fireEvent.keyDown(window, { ctrlKey: true, key: '.' });
    expect(screen.getByRole('region', { name: 'Groam AI' })).toBeDefined();
    fireEvent.keyDown(window, { ctrlKey: true, key: '.' });
    expect(screen.queryByRole('region', { name: 'Groam AI' })).toBeNull();
  });

  test('closes when the registered page changes', async () => {
    const view = renderWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Open Groam AI' }));
    expect(screen.getByRole('region', { name: 'Groam AI' })).toBeDefined();

    view.rerender(
      <AgentContextProvider>
        <ContextRegistration
          value={{
            ...context,
            key: 'trip:trip-1:itinerary',
            target: { kind: 'trip', section: 'itinerary', tripId: 'trip-1' as never },
            title: 'Portugal · Itinerary'
          }}
        />
        <AiAssistantWidget />
      </AgentContextProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Groam AI' })).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Open Groam AI' })).toBeDefined();
  });

  test('can stop a streaming response from the composer', () => {
    assistant.canStop = true;
    assistant.isResponding = true;
    renderWidget();
    expect(
      screen.getByRole('button', { name: 'Open Groam AI, response in progress' })
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Open Groam AI, response in progress' }));

    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }));
    expect(assistant.stop).toHaveBeenCalledTimes(1);
  });

  test('waits for a page to register context', () => {
    renderWidget(false);
    fireEvent.click(screen.getByRole('button', { name: 'Open Groam AI' }));

    expect(screen.getByText('No screen context registered')).toBeDefined();
    expect(
      (screen.getByRole('textbox', { name: 'Assistant prompt' }) as HTMLInputElement).disabled
    ).toBe(true);
  });
});
