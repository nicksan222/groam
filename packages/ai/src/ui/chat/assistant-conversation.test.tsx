import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { assistantContextMessage } from '#ai/agents';
import type { AgentScreenContext } from '#ai/ui/context/agent-context';
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
  smoothTextState.complete = true;
});

test('renders durable tool usage as chat activity', async () => {
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

  await render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message]}
      status="Exhausted"
    />
  );

  await expect.element(page.getByText('Read screen context')).not.toBeInTheDocument();
  await expect.element(page.getByText('Used propose thing')).toBeInTheDocument();
  await expect.element(page.getByText('Updated trip dates')).toBeInTheDocument();
  await expect.element(page.getByText('2027-01-01 – 2027-01-10')).toBeInTheDocument();
  expect(page.getByText('Completed').elements()).toHaveLength(2);
  await expect
    .element(page.getByText('The result is recorded in this conversation.'))
    .toBeInTheDocument();
  await expect.element(page.getByText('@groam')).not.toBeInTheDocument();
  await expect.element(page.getByRole('log')).toHaveClass('justify-end');
});

test('shows tappable choices requested by an agent', async () => {
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

  await render(
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

  await page.getByRole('button', { name: 'Morning' }).click();
  expect(onReply).toHaveBeenCalledWith('What time works best?\nMy choice: Morning');
});

test('keeps a submitted choice as a complete selected form instead of echoing its raw prompt', async () => {
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

  await render(
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

  await expect
    .element(page.getByRole('button', { name: options[0] }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: options[1] })).toBeInTheDocument();
  await expect.element(page.getByText(`My choice: ${options[0]}`)).not.toBeInTheDocument();
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

  await render(
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

  await expect.element(page.getByRole('button', { name: 'Itinerary' })).not.toBeInTheDocument();
  const customAnswer = page.getByRole('textbox', { name: 'Custom answer' }).element();
  expect(customAnswer.getAttribute('aria-multiline')).toBe('true');
  await userEvent.fill(customAnswer, 'Check whether every reservation has a confirmation number.');
  await page.getByRole('button', { name: 'Send custom answer' }).click();

  await vi.waitFor(() =>
    expect(onReply).toHaveBeenCalledWith(
      'What do you want me to check?\nMy choice: Check whether every reservation has a confirmation number.'
    )
  );
});

test('waits for preceding response text before showing a choice', async () => {
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

  const view = await render(
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

  await expect.element(page.getByText('What do you want me to check?')).not.toBeInTheDocument();

  message.status = 'success';
  await view.rerender(
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
  await expect.element(page.getByText('What do you want me to check?')).not.toBeInTheDocument();

  smoothTextState.complete = true;
  await view.rerender(
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
  await expect.element(page.getByText('What do you want me to check?')).toBeInTheDocument();
});

test('wraps long choice text within the chat panel', async () => {
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

  await render(
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

  await expect.element(page.getByRole('button', { name: longOption })).toHaveClass('min-w-0');
  await expect.element(page.getByRole('button', { name: longOption })).toHaveClass('w-full');
  await expect.element(page.getByText(longOption)).toHaveClass('[overflow-wrap:anywhere]');
});

test('shows a simple conversation preview while messages load', async () => {
  await render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[]}
      status="LoadingFirstPage"
    />
  );

  await expect.element(page.getByRole('status', { name: 'Loading messages' })).toBeInTheDocument();
  await expect.element(page.getByText('Bringing the conversation into view…')).toBeInTheDocument();
});

test('shows a polished activity state while the agent prepares a response', async () => {
  await render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending
      loadMore={vi.fn()}
      messages={[]}
      status="Exhausted"
    />
  );

  await expect.element(page.getByText('Thinking…')).toBeInTheDocument();
  await expect
    .element(page.getByText('Reading the context and choosing the next step'))
    .toBeInTheDocument();
  await expect.element(page.getByText('...')).not.toBeInTheDocument();
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

  await render(
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

  expect(await page.getByText('Trip preferences').findElement({ timeout: 3_000 })).toBeDefined();
  await expect.element(page.getByText(/\{"op":"add"/u)).not.toBeInTheDocument();
  await expect.element(page.getByText('Which pace should we use?')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Send preferences' }).click();
  await vi.waitFor(() =>
    expect(onReply).toHaveBeenCalledWith(
      'Here are my form responses:\n{\n  "pace": "Balanced",\n  "seat": "Window"\n}'
    )
  );
  await expect.element(page.getByText('Answers saved in this AI chat')).toBeInTheDocument();
});

test('keeps a submitted generated form in the conversation instead of collapsing it into a response bubble', async () => {
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

  await render(
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

  await expect.element(page.getByText('Trip preferences')).toBeInTheDocument();
  await expect.element(page.getByText('Answers saved in this AI chat')).toBeInTheDocument();
  await expect.element(page.getByText('Here are my form responses:')).not.toBeInTheDocument();
});

test('offers concise screen-aware starting prompts', async () => {
  const onReply = vi.fn().mockResolvedValue(true);
  await render(
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

  await page.getByRole('button', { name: 'Check what still needs attention' }).click();
  expect(onReply).toHaveBeenCalledWith('What still needs attention for this trip?');
});

test('shows optimistic send status, sources, and completed-response actions', async () => {
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
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

  await render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending
      loadMore={vi.fn()}
      messages={[userMessage, assistantMessage]}
      status="Exhausted"
    />
  );

  await expect.element(page.getByText('Sending…')).toBeInTheDocument();
  expect(
    page
      .getByRole('link', { name: /Portugal Travel Guide/u })
      .element()
      .getAttribute('href')
  ).toBe('https://example.com/portugal');
  await page.getByRole('button', { name: 'Copy AI response' }).click();
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('Here is a useful guide.'));
});

test('shows failed responses without exposing internal system messages', async () => {
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

  await render(
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

  expect(page.getByRole('status').element().textContent).toContain(
    'Groam AI could not complete that reply. Try again in a moment.'
  );
  await userEvent.click(page.getByRole('button', { name: 'Resend message' }).elements()[1]!);
  expect(onResend).toHaveBeenCalledWith(userMessage);
  await expect.element(page.getByText('Private system instruction')).not.toBeInTheDocument();
});

test('shows the durable screen context recorded before a message', async () => {
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

  await render(
    <AssistantConversation
      context={null}
      isOpening={false}
      isSending={false}
      loadMore={vi.fn()}
      messages={[message, { ...message, id: 'context-2', key: 'thread-1-2-0', order: 2 }]}
      status="Exhausted"
    />
  );

  const marker = page
    .getByRole('note', {
      name: 'Context: Portugal · Decisions, @groam, tagged Portugal'
    })
    .element();
  expect(page.getByRole('note').elements()).toHaveLength(1);
  expect(marker.textContent).toContain('Portugal · Decisions · Portugal');
  await expect.element(page.getByText('@groam')).toBeInTheDocument();
});

test('disables welcome suggestions while no thread is available', async () => {
  const onReply = vi.fn().mockResolvedValue(true);
  const context: AgentScreenContext = {
    capabilities: ['trip.status.read'],
    data: {},
    description: 'Explain decisions.',
    key: 'trip:trip-1:decisions',
    target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
    title: 'Portugal · Decisions'
  };
  const props = {
    context,
    isOpening: false,
    isSending: false,
    loadMore: vi.fn(),
    messages: [] as UIMessage[],
    onReply,
    status: 'Exhausted'
  };
  const view = await render(<AssistantConversation {...props} unavailable />);

  await expect.element(page.getByRole('heading', { name: 'How can I help?' })).toBeInTheDocument();
  const suggestions = page.getByRole('button').elements();
  expect(suggestions.length).toBeGreaterThan(0);
  for (const suggestion of suggestions) expect(suggestion).toHaveProperty('disabled', true);

  await view.rerender(<AssistantConversation {...props} />);
  await page.getByRole('button').first().click();
  expect(onReply).toHaveBeenCalledTimes(1);
});
