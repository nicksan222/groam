import { afterEach, expect, test, vi } from 'vite-plus/test';
import { chatGptFetch } from './responses-fetch';
afterEach(() => vi.unstubAllGlobals());
const endpoint = 'https://api.openai.com/v1/responses';

/** Real ChatGPT upstream shape: items arrive as output_item.done, `response.completed` has `output: []`. */
function upstreamStream(
  items: object[],
  usage = { input_tokens: 4, output_tokens: 2, total_tokens: 6 }
) {
  const events = [
    ...items.map((item, index) => ({
      type: 'response.output_item.done',
      output_index: index,
      item
    })),
    {
      type: 'response.completed',
      response: {
        id: 'resp_test',
        created_at: 1,
        model: 'account-model',
        object: 'response',
        status: 'completed',
        output: [],
        usage
      }
    }
  ];
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''));
}

const replyMessage = {
  type: 'message',
  id: 'msg_test',
  role: 'assistant',
  status: 'completed',
  content: [{ type: 'output_text', text: 'Visit Rome', annotations: [] }]
};
const tripCall = {
  type: 'function_call',
  id: 'fc_first',
  call_id: 'call_trip',
  name: 'trip',
  namespace: 'groam',
  arguments: '{"city":"Rome"}',
  status: 'completed'
};
test('forces stream and disables store while adapting generate calls', async () => {
  const mock = vi.fn(
    async (_input: unknown, _init?: RequestInit) =>
      new Response('data: {"type":"response.completed","response":{"id":"done","output":[]}}\n\n')
  );
  vi.stubGlobal('fetch', mock);
  expect(
    await (
      await chatGptFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ model: 'm', store: true })
      })
    ).json()
  ).toEqual({ id: 'done', output: [] });
  expect(JSON.parse(mock.mock.calls[0]![1]!.body as string)).toEqual({
    model: 'm',
    input: [],
    store: false,
    stream: true
  });
});
test('rejects untrusted endpoints and interrupted or failed streams', async () => {
  await expect(chatGptFetch('https://evil.test', { method: 'POST' })).rejects.toThrow(
    'Unsupported'
  );
  for (const type of ['response.failed', 'response.incomplete']) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`data: ${JSON.stringify({ type })}\n\n`))
    );
    await expect(chatGptFetch(endpoint, { method: 'POST', body: '{}' })).rejects.toThrow(
      'could not complete'
    );
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(''))
  );
  await expect(chatGptFetch(endpoint, { method: 'POST', body: '{}' })).rejects.toThrow(
    'interrupted'
  );
});

test('streaming consumers reject incomplete and interrupted streams', async () => {
  for (const event of ['response.failed', 'response.incomplete', 'response.output_text.delta']) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`data: ${JSON.stringify({ type: event })}\n\n`))
    );
    const response = await chatGptFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ stream: true })
    });
    await expect(response.text()).rejects.toThrow(
      event === 'response.output_text.delta' ? 'interrupted' : 'could not complete'
    );
  }
});
test('streaming validation preserves chunked CRLF events through response.completed', async () => {
  const parts = [
    'data: {"type":"response.output_text.delta","delta":"hello"}\r',
    '\n\r\n',
    'data: {"type":"response.completed","response":{"id":"done"}}\r\n\r\n'
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
              controller.close();
            }
          })
        )
    )
  );
  const response = await chatGptFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ stream: true })
  });
  expect(await response.text()).toBe(parts.join(''));
});

test('AI SDK generate with system instructions, tools, and output cap emits a preview-compatible request', async () => {
  const { configuredChatGptProvider } = await import('#backend/ai/chatgpt/model');
  const upstream = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    upstreamStream([replyMessage])
  );
  vi.stubGlobal('fetch', upstream);
  const { languageModel } = configuredChatGptProvider({
    accessToken: 'personal-token',
    model: 'account-model'
  });
  const result = await languageModel.doGenerate({
    prompt: [
      { role: 'system', content: 'Help plan trips' },
      { role: 'user', content: [{ type: 'text', text: 'Plan a trip' }] }
    ],
    maxOutputTokens: 1024,
    temperature: 0.5,
    tools: [
      {
        type: 'function',
        name: 'trip',
        description: 'Plan trip',
        inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false }
      }
    ]
  });
  const body = JSON.parse(upstream.mock.calls[0]![1]!.body as string);
  expect(body.input).toEqual([
    { role: 'developer', content: 'Help plan trips' },
    { role: 'user', content: [{ type: 'input_text', text: 'Plan a trip' }] }
  ]);
  expect(body).not.toHaveProperty('max_output_tokens');
  expect(body).not.toHaveProperty('temperature');
  expect(body.tools).toEqual([
    {
      type: 'namespace',
      name: 'groam',
      description: 'Groam trip planning tools',
      tools: [expect.objectContaining({ type: 'function', name: 'trip' })]
    }
  ]);
  expect(body).toMatchObject({ store: false, stream: true });
  expect(result.content).toContainEqual(
    expect.objectContaining({ type: 'text', text: 'Visit Rome' })
  );
});

test('SDK second turns preserve complete assistant history instead of server item references', async () => {
  const { configuredChatGptProvider } = await import('#backend/ai/chatgpt/model');
  const upstream = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    upstreamStream([replyMessage])
  );
  vi.stubGlobal('fetch', upstream);
  const { languageModel } = configuredChatGptProvider({
    accessToken: 'personal-token',
    model: 'account-model'
  });
  const secondTurn = await languageModel.doGenerate({
    providerOptions: { openai: { store: true } },
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'Where should I go?' }] },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Visit Rome',
            providerOptions: { openai: { itemId: 'msg_previous' } }
          }
        ]
      },
      { role: 'user', content: [{ type: 'text', text: 'What should I see?' }] }
    ]
  });
  const body = JSON.parse(upstream.mock.calls[0]![1]!.body as string);
  expect(secondTurn.content).toContainEqual(
    expect.objectContaining({ type: 'text', text: 'Visit Rome' })
  );
  expect(body.input).toContainEqual({ role: 'assistant', content: 'Visit Rome' });
  expect(body.input.some((item: { type?: string }) => item.type === 'item_reference')).toBe(false);
  expect(body.store).toBe(false);
});

test('SDK function tool loop sends namespace-qualified calls with matching call outputs', async () => {
  const { configuredChatGptProvider } = await import('#backend/ai/chatgpt/model');
  let turn = 0;
  const upstream = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    upstreamStream(turn++ === 0 ? [tripCall] : [])
  );
  vi.stubGlobal('fetch', upstream);
  const { languageModel } = configuredChatGptProvider({
    accessToken: 'personal-token',
    model: 'account-model'
  });
  const tools = [
    {
      type: 'function' as const,
      name: 'trip',
      description: 'Plan trip',
      inputSchema: {
        type: 'object' as const,
        properties: { city: { type: 'string' as const } },
        additionalProperties: false
      }
    }
  ];
  const first = await languageModel.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'Visit Rome' }] }],
    tools,
    toolChoice: { type: 'tool', toolName: 'trip' }
  });
  const call = first.content.find((item) => item.type === 'tool-call');
  expect(call).toMatchObject({
    type: 'tool-call',
    toolCallId: 'call_trip',
    toolName: 'trip',
    input: '{"city":"Rome"}'
  });
  await languageModel.doGenerate({
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'Visit Rome' }] },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call_trip',
            toolName: 'trip',
            input: { city: 'Rome' },
            providerOptions: { openai: { itemId: 'fc_first' } }
          }
        ]
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_trip',
            toolName: 'trip',
            output: { type: 'text', value: 'Rome trip saved' }
          }
        ]
      }
    ],
    tools
  });
  const firstBody = JSON.parse(upstream.mock.calls[0]![1]!.body as string);
  expect(firstBody.tool_choice).toEqual({ type: 'function', name: 'trip' });
  const secondBody = JSON.parse(upstream.mock.calls[1]![1]!.body as string);
  expect(secondBody.input).toContainEqual(
    expect.objectContaining({
      type: 'function_call',
      name: 'trip',
      namespace: 'groam',
      call_id: 'call_trip',
      arguments: '{"city":"Rome"}'
    })
  );
  expect(secondBody.input).toContainEqual({
    type: 'function_call_output',
    call_id: 'call_trip',
    output: 'Rome trip saved'
  });
  expect(secondBody.input.some((item: { type?: string }) => item.type === 'item_reference')).toBe(
    false
  );
});

test('SDK stream emits text and a namespaced function call from realistic upstream events', async () => {
  const { configuredChatGptProvider } = await import('#backend/ai/chatgpt/model');
  const events = [
    {
      type: 'response.created',
      response: { id: 'resp_test', created_at: 1, model: 'account-model' }
    },
    {
      type: 'response.output_item.added',
      output_index: 0,
      item: {
        type: 'message',
        id: 'msg_test',
        role: 'assistant',
        status: 'in_progress',
        content: []
      }
    },
    {
      type: 'response.output_text.delta',
      item_id: 'msg_test',
      output_index: 0,
      content_index: 0,
      delta: 'Visit '
    },
    {
      type: 'response.output_text.delta',
      item_id: 'msg_test',
      output_index: 0,
      content_index: 0,
      delta: 'Rome'
    },
    { type: 'response.output_item.done', output_index: 0, item: replyMessage },
    {
      type: 'response.output_item.added',
      output_index: 1,
      item: { ...tripCall, arguments: '', status: 'in_progress' }
    },
    {
      type: 'response.function_call_arguments.delta',
      item_id: 'fc_first',
      output_index: 1,
      delta: '{"city":"Rome"}'
    },
    { type: 'response.output_item.done', output_index: 1, item: tripCall },
    {
      type: 'response.completed',
      response: {
        id: 'resp_test',
        created_at: 1,
        model: 'account-model',
        object: 'response',
        status: 'completed',
        output: [],
        usage: { input_tokens: 4, output_tokens: 2, total_tokens: 6 }
      }
    }
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''))
    )
  );
  const { languageModel } = configuredChatGptProvider({
    accessToken: 'personal-token',
    model: 'account-model'
  });
  const { stream } = await languageModel.doStream({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'Visit Rome' }] }],
    tools: [
      {
        type: 'function',
        name: 'trip',
        description: 'Plan trip',
        inputSchema: {
          type: 'object' as const,
          properties: { city: { type: 'string' as const } },
          additionalProperties: false
        }
      }
    ]
  });
  const parts = [];
  const reader = stream.getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read())
    parts.push(read.value);
  expect(
    parts
      .filter((part) => part.type === 'text-delta')
      .map((part) => part.delta)
      .join('')
  ).toBe('Visit Rome');
  expect(parts).toContainEqual(
    expect.objectContaining({
      type: 'tool-call',
      toolCallId: 'call_trip',
      toolName: 'trip',
      input: '{"city":"Rome"}'
    })
  );
  expect(parts.at(-1)).toMatchObject({ type: 'finish', finishReason: { unified: 'tool-calls' } });
});

test('rejects unsupported allowed_tools selection before sending tokens or requests', async () => {
  const upstream = vi.fn();
  vi.stubGlobal('fetch', upstream);
  await expect(
    chatGptFetch(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer personal-token' },
      body: JSON.stringify({
        input: [],
        tool_choice: {
          type: 'allowed_tools',
          mode: 'auto',
          tools: [{ type: 'function', name: 'trip' }]
        }
      })
    })
  ).rejects.toThrow('Choose auto, required, or a specific local tool');
  expect(upstream).not.toHaveBeenCalled();
});

test.each(['generate', 'stream'] as const)(
  'SDK %s preserves safe ChatGPT plan error codes without upstream secrets',
  async (mode) => {
    const { configuredChatGptProvider } = await import('#backend/ai/chatgpt/model');
    const { assistantFailureMessage } = await import('@groam/ai/backend/errors');
    for (const code of [
      'subscription_sharing_usage_limit_exceeded',
      'subscription_sharing_usage_unavailable',
      'unknown-private-secret'
    ]) {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(
              `data: ${JSON.stringify({ type: 'response.failed', response: { error: { code, message: 'Bearer private-token refresh_token=private-refresh' } } })}\n\n`
            )
        )
      );
      const { languageModel } = configuredChatGptProvider({
        accessToken: 'personal-token',
        model: 'account-model'
      });
      let caught: unknown;
      try {
        const options = {
          prompt: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] }]
        };
        if (mode === 'generate') await languageModel.doGenerate(options);
        else {
          const result = await languageModel.doStream(options);
          const reader = result.stream.getReader();
          while (!(await reader.read()).done) {
            /* Read through the required terminal event. */
          }
        }
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      const friendly = assistantFailureMessage(caught);
      expect(friendly).not.toContain('private');
      expect(JSON.stringify(caught)).not.toContain('private');
      if (code === 'subscription_sharing_usage_limit_exceeded')
        expect(friendly).toContain('ChatGPT Settings → Usage');
      if (code === 'subscription_sharing_usage_unavailable')
        expect(friendly).toBe('ChatGPT plan usage is temporarily unavailable. Try again later.');
    }
  }
);

test('generate calls rebuild the output from streamed items when the completed event has none', async () => {
  // ChatGPT plan inference sends `output: []` on `response.completed`; the items arrive earlier.
  const message = {
    type: 'message',
    id: 'msg_1',
    role: 'assistant',
    status: 'completed',
    content: [{ type: 'output_text', text: 'pineapple', annotations: [] }]
  };
  const call = {
    type: 'function_call',
    id: 'fc_1',
    call_id: 'call_1',
    name: 'trip',
    namespace: 'groam',
    arguments: '{}',
    status: 'completed'
  };
  const events = [
    { type: 'response.output_item.done', output_index: 1, item: call },
    { type: 'response.output_item.done', output_index: 0, item: message },
    {
      type: 'response.completed',
      response: { id: 'resp_1', status: 'completed', output: [], usage: { input_tokens: 1 } }
    }
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''))
    )
  );
  const response = await chatGptFetch(endpoint, { method: 'POST', body: '{"model":"m"}' });
  expect(await response.json()).toEqual({
    id: 'resp_1',
    status: 'completed',
    output: [message, call],
    usage: { input_tokens: 1 }
  });
});

test('generate calls keep a completed event output that is already filled', async () => {
  const item = { type: 'message', id: 'msg_2', role: 'assistant', content: [] };
  const events = [
    { type: 'response.output_item.done', output_index: 0, item: { ...item, id: 'stale' } },
    { type: 'response.completed', response: { id: 'resp_2', output: [item] } }
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''))
    )
  );
  const response = await chatGptFetch(endpoint, { method: 'POST', body: '{"model":"m"}' });
  expect(await response.json()).toEqual({ id: 'resp_2', output: [item] });
});
