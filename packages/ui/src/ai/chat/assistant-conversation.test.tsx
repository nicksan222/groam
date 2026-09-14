import type { UIMessage } from '@convex-dev/agent/react';
import { assistantContextMessage } from '@groam/ai-contracts/agents/registry';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AssistantConversation } from './assistant-conversation';

const smoothTextState = vi.hoisted(() => ({ complete: true }));

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) =>
    smoothTextState.complete
      ? [text, { cursor: text.length, isStreaming: false }]
      : [text.slice(0, 7), { cursor: Math.min(7, text.length), isStreaming: true }]
}));

afterEach(() => {
  cleanup();
  smoothTextState.complete = true;
});

test('renders durable tool usage as chat activity', () => {
  const message = {
    _creationTime: 1,
    id: 'assistant-tool-1',
    key: 'thread-1-1-0',
    order: 1,
    parts: [
      {
        input: {},
        output: { title: 'Portugal' },
        state: 'output-available',
        toolCallId: 'screen-1',
        type: 'tool-getScreenContext'
      },
      {
        input: {},
        output: { title: 'Portugal' },
        state: 'output-available',
        toolCallId: 'screen-duplicate',
        type: 'tool-getScreenContext'
      },
      {
        input: {},
        output: { ok: true },
        state: 'output-available',
        toolCallId: 'future-1',
        type: 'tool-proposeThing'
      },
      {
        input: { endDate: '2027-01-10', startDate: '2027-01-01' },
        output: {
          activity: {
            detail: '2027-01-01 – 2027-01-10',
            id: 'trip.dates.set.done',
            label: 'Updated trip dates',
            version: 1
          }
        },
        state: 'output-available',
        toolCallId: 'dates-1',
        type: 'tool-setTripDates'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: 'I checked the screen.'
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      status="Exhausted"
    />
  );

  expect(screen.queryByText('Read screen context')).toBeNull();
  expect(screen.getByText('Used propose thing')).toBeDefined();
  expect(screen.getByText('Updated trip dates')).toBeDefined();
  expect(screen.getByText('2027-01-01 – 2027-01-10')).toBeDefined();
  expect(screen.getAllByText('Completed')).toHaveLength(2);
  expect(screen.getByText('The result is recorded in this conversation.')).toBeDefined();
  expect(screen.queryByText('@groam')).toBeNull();
  expect(screen.getByRole('log').className).toContain('justify-end');
});

test('shows tappable choices requested by an agent', () => {
  const onReply = vi.fn().mockResolvedValue(true);
  const message = {
    _creationTime: 1,
    id: 'assistant-1',
    key: 'thread-1-1-0',
    order: 1,
    parts: [
      {
        input: { options: ['Morning', 'Afternoon'], question: 'What time works best?' },
        output: { options: ['Morning', 'Afternoon'], question: 'What time works best?' },
        state: 'output-available',
        toolCallId: 'choice-1',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: 'Pick a time.'
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={onReply}
      status="Exhausted"
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Morning' }));
  expect(onReply).toHaveBeenCalledWith('What time works best?\nMy choice: Morning');
});

test('keeps a submitted choice as a complete selected form instead of echoing its raw prompt', () => {
  const question = 'Should I apply the reworked Lisbon itinerary?';
  const options = ['Yes — apply it', 'No — keep the current itinerary', 'Show hotels first'];
  const assistant = {
    _creationTime: 1,
    id: 'assistant-choice',
    key: 'assistant-choice',
    order: 1,
    parts: [
      {
        input: { options, question },
        output: { options, question },
        state: 'output-available',
        toolCallId: 'choice-form',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: question
  } as unknown as UIMessage;
  const responseText = `${question}\nMy choice: ${options[0]}`;
  const response = {
    _creationTime: 2,
    id: 'choice-response',
    key: 'choice-response',
    order: 2,
    parts: [{ text: responseText, type: 'text' }],
    role: 'user',
    status: 'success',
    stepOrder: 0,
    text: responseText
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[assistant, response]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );

  expect(screen.getByRole('button', { name: options[0] }).getAttribute('aria-pressed')).toBe(
    'true'
  );
  expect(screen.getByRole('button', { name: options[1] })).toBeDefined();
  expect(screen.queryByText(`My choice: ${options[0]}`)).toBeNull();
});

test('offers a multiline custom answer as the fourth choice', async () => {
  const onReply = vi.fn().mockResolvedValue(true);
  const message = {
    _creationTime: 1,
    id: 'assistant-custom-choice',
    key: 'thread-1-custom-choice-0',
    order: 1,
    parts: [
      {
        input: {
          options: ['Trip dates', 'Travel documents', 'Packing list', 'Itinerary'],
          question: 'What do you want me to check?'
        },
        state: 'output-available',
        toolCallId: 'custom-choice-1',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: 'Pick an area.'
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={onReply}
      status="Exhausted"
    />
  );

  expect(screen.queryByRole('button', { name: 'Itinerary' })).toBeNull();
  const customAnswer = screen.getByRole('textbox', { name: 'Custom answer' });
  expect(customAnswer.tagName).toBe('TEXTAREA');
  expect(customAnswer.getAttribute('rows')).toBe('2');
  fireEvent.change(customAnswer, {
    target: { value: 'Check whether every reservation has a confirmation number.' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send custom answer' }));

  await waitFor(() =>
    expect(onReply).toHaveBeenCalledWith(
      'What do you want me to check?\nMy choice: Check whether every reservation has a confirmation number.'
    )
  );
});

test('waits for preceding response text before showing a choice', () => {
  const text = 'I asked which area to check — please pick one of the options above.';
  const message = {
    _creationTime: 1,
    id: 'assistant-delayed-choice',
    key: 'thread-1-delayed-choice-0',
    order: 1,
    parts: [
      { state: 'streaming', text, type: 'text' },
      {
        input: {
          options: ['Trip dates', 'Travel documents'],
          question: 'What do you want me to check?'
        },
        state: 'input-available',
        toolCallId: 'delayed-choice-1',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'streaming',
    stepOrder: 0,
    text
  } as unknown as UIMessage;
  smoothTextState.complete = false;

  const view = render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending
      loadMore={vi.fn()}
      messages={[message]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );

  expect(screen.queryByText('What do you want me to check?')).toBeNull();

  message.status = 'success';
  view.rerender(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );
  expect(screen.queryByText('What do you want me to check?')).toBeNull();

  smoothTextState.complete = true;
  view.rerender(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );
  expect(screen.getByText('What do you want me to check?')).toBeDefined();
});

test('wraps long choice text within the chat panel', () => {
  const longOption = `Keep ${'SplitAndMontréal'.repeat(20)} with detailed travel-day planning`;
  const message = {
    _creationTime: 1,
    id: 'assistant-long-choice',
    key: 'thread-1-long-choice-0',
    order: 1,
    parts: [
      {
        input: {
          options: ['Focus on Split', longOption],
          question: 'Which route should I improve?'
        },
        output: {
          options: ['Focus on Split', longOption],
          question: 'Which route should I improve?'
        },
        state: 'output-available',
        toolCallId: 'long-choice-1',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: 'Choose a route.'
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );

  expect(screen.getByRole('button', { name: longOption }).className).toContain('min-w-0');
  expect(screen.getByRole('button', { name: longOption }).className).toContain('w-full');
  expect(screen.getByText(longOption).className).toContain('[overflow-wrap:anywhere]');
});

test('shows a simple conversation preview while messages load', () => {
  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[]}
      status="LoadingFirstPage"
    />
  );

  expect(screen.getByRole('status', { name: 'Loading messages' })).toBeDefined();
  expect(screen.getByText('Bringing the conversation into view…')).toBeDefined();
});

test('shows a polished activity state while the agent prepares a response', () => {
  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending
      loadMore={vi.fn()}
      messages={[]}
      status="Exhausted"
    />
  );

  expect(screen.getByText('Thinking…')).toBeDefined();
  expect(screen.getByText('Reading the context and choosing the next step')).toBeDefined();
  expect(screen.queryByText('...')).toBeNull();
});

test('renders and submits a generated json-render form', async () => {
  const onReply = vi.fn().mockResolvedValue(true);
  const text = `Tell me what works for you.\n\n\`\`\`spec
{"op":"add","path":"/root","value":"form"}
{"op":"add","path":"/elements/form","value":{"type":"Card","props":{"title":"Trip preferences","description":"A couple of quick details"},"children":["fields"]}}
{"op":"add","path":"/elements/fields","value":{"type":"Stack","props":{"direction":"vertical","gap":"md","align":"stretch","justify":"start"},"children":["summary","submit"]}}
{"op":"add","path":"/elements/summary","value":{"type":"Text","props":{"text":"Balanced pace · window seat","variant":"muted"},"children":[]}}
{"op":"add","path":"/elements/submit","value":{"type":"Button","props":{"label":"Send preferences","variant":"primary","disabled":false},"on":{"press":{"action":"submitForm","params":{"values":{"$state":"/form"}}}},"children":[]}}
{"op":"add","path":"/state/form","value":{"pace":"Balanced","seat":"Window"}}
\`\`\``;
  const message = {
    _creationTime: 1,
    id: 'assistant-form-1',
    key: 'thread-1-1-0',
    order: 1,
    parts: [
      { state: 'done', text, type: 'text' },
      {
        input: {
          options: ['Balanced', 'Fast'],
          question: 'Which pace should we use?'
        },
        output: {
          options: ['Balanced', 'Fast'],
          question: 'Which pace should we use?'
        },
        state: 'output-available',
        toolCallId: 'duplicate-choice',
        type: 'tool-askUserChoice'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      onReply={onReply}
      status="Exhausted"
    />
  );

  expect(await screen.findByText('Trip preferences', {}, { timeout: 3_000 })).toBeDefined();
  expect(screen.queryByText(/\{"op":"add"/u)).toBeNull();
  expect(screen.queryByText('Which pace should we use?')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Send preferences' }));
  await waitFor(() =>
    expect(onReply).toHaveBeenCalledWith(
      'Here are my form responses:\n{\n  "pace": "Balanced",\n  "seat": "Window"\n}'
    )
  );
  expect(screen.getByText('Answers saved in this AI chat')).toBeDefined();
});

test('keeps a submitted generated form in the conversation instead of collapsing it into a response bubble', () => {
  const formText = `Choose a pace.\n\n\`\`\`spec
{"op":"add","path":"/root","value":"form"}
{"op":"add","path":"/elements/form","value":{"type":"Card","props":{"title":"Trip preferences","description":"Choose what works best"},"children":["summary"]}}
{"op":"add","path":"/elements/summary","value":{"type":"Text","props":{"text":"Balanced pace","variant":"muted"},"children":[]}}
{"op":"add","path":"/state/form","value":{"pace":"Balanced"}}
\`\`\``;
  const assistant = {
    _creationTime: 1,
    id: 'assistant-form',
    key: 'assistant-form',
    order: 1,
    parts: [{ text: formText, type: 'text' }],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: formText
  } as unknown as UIMessage;
  const response = {
    _creationTime: 2,
    id: 'form-response',
    key: 'form-response',
    order: 2,
    parts: [{ text: 'Here are my form responses:\n{\n  "pace": "Fast"\n}', type: 'text' }],
    role: 'user',
    status: 'success',
    stepOrder: 0,
    text: 'Here are my form responses:\n{\n  "pace": "Fast"\n}'
  } as unknown as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[assistant, response]}
      onReply={vi.fn().mockResolvedValue(true)}
      status="Exhausted"
    />
  );

  expect(screen.getByText('Trip preferences')).toBeDefined();
  expect(screen.getByText('Answers saved in this AI chat')).toBeDefined();
  expect(screen.queryByText('Here are my form responses:')).toBeNull();
});

test('offers concise screen-aware starting prompts', () => {
  const onReply = vi.fn().mockResolvedValue(true);
  render(
    <AssistantConversation
      context={{
        capabilities: ['trip.status.read'],
        data: {},
        description: 'Review this trip.',
        key: 'trip:trip-1:decisions',
        title: 'Portugal · Decisions'
      }}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[]}
      onReply={onReply}
      status="Exhausted"
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Check what still needs attention' }));
  expect(onReply).toHaveBeenCalledWith('What still needs attention for this trip?');
});

test('shows optimistic send status, sources, and completed-response actions', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  });
  const userMessage = {
    _creationTime: 1,
    id: 'optimistic-user-1',
    key: 'optimistic-user-1',
    order: 1,
    parts: [{ text: 'Find a useful guide', type: 'text' }],
    role: 'user',
    status: 'pending',
    stepOrder: 0,
    text: 'Find a useful guide'
  } as UIMessage;
  const assistantMessage = {
    _creationTime: 2,
    id: 'assistant-source-1',
    key: 'assistant-source-1',
    order: 2,
    parts: [
      { text: 'Here is a useful guide.', type: 'text' },
      {
        sourceId: 'source-1',
        title: 'Portugal Travel Guide',
        type: 'source-url',
        url: 'https://example.com/portugal'
      }
    ],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text: 'Here is a useful guide.'
  } as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending
      loadMore={vi.fn()}
      messages={[userMessage, assistantMessage]}
      status="Exhausted"
    />
  );

  expect(screen.getByText('Sending…')).toBeDefined();
  expect(screen.getByRole('link', { name: /Portugal Travel Guide/u }).getAttribute('href')).toBe(
    'https://example.com/portugal'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy AI response' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('Here is a useful guide.'));
});

test('shows failed responses without exposing internal system messages', () => {
  const onResend = vi.fn().mockResolvedValue(true);
  const message = {
    _creationTime: 1,
    id: 'assistant-failed-1',
    key: 'thread-1-1-0',
    order: 1,
    parts: [],
    role: 'assistant',
    status: 'failed',
    stepOrder: 0,
    text: ''
  } as unknown as UIMessage;
  const userMessage = {
    ...message,
    id: 'user-1',
    key: 'user-1',
    role: 'user',
    text: 'Plan a better itinerary'
  } as UIMessage;
  const internalMessage = {
    ...message,
    id: 'system-1',
    key: 'system-1',
    role: 'system',
    text: 'Private system instruction'
  } as UIMessage;

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[internalMessage, userMessage, message]}
      onResend={onResend}
      status="Exhausted"
    />
  );

  expect(screen.getByRole('alert').textContent).toContain(
    'Groam AI could not complete that reply. Try again in a moment.'
  );
  fireEvent.click(screen.getAllByRole('button', { name: 'Resend message' })[1]!);
  expect(onResend).toHaveBeenCalledWith(userMessage);
  expect(screen.queryByText('Private system instruction')).toBeNull();
});

test('shows the durable screen context recorded before a message', () => {
  const text = assistantContextMessage({
    agent: 'groam',
    key: 'trip:trip-1:decisions',
    tags: [{ id: 'trip-1', kind: 'trip', label: 'Portugal', tripId: 'trip-1' }],
    target: { kind: 'trip', section: 'decisions', tripId: 'trip-1' },
    title: 'Portugal · Decisions'
  });
  const message: UIMessage = {
    _creationTime: 1,
    id: 'context-1',
    key: 'thread-1-1-0',
    order: 1,
    parts: [{ state: 'done', text, type: 'text' }],
    role: 'system',
    status: 'success',
    stepOrder: 0,
    text
  };

  render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message, { ...message, id: 'context-2', key: 'thread-1-2-0', order: 2 }]}
      status="Exhausted"
    />
  );

  const marker = screen.getByRole('note', {
    name: 'Context: Portugal · Decisions, @groam, tagged Portugal'
  });
  expect(screen.getAllByRole('note')).toHaveLength(1);
  expect(marker.textContent).toContain('Portugal · Decisions · Portugal');
  expect(screen.getByText('@groam')).toBeDefined();
});
