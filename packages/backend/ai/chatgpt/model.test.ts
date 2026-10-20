import { generateText } from 'ai';
import { expect, test, vi } from 'vite-plus/test';
import { configuredChatGptProvider } from './model';
import { chatGptRequest } from './request';

test('requires an explicit personal token and account model', () => {
  expect(() => configuredChatGptProvider({ accessToken: '', model: 'account-model' })).toThrow(
    'Connect ChatGPT'
  );
  expect(() => configuredChatGptProvider({ accessToken: 'token', model: '' })).toThrow(
    'Connect ChatGPT'
  );
});
test('uses Responses, the selected model, and supported web search', () => {
  const result = configuredChatGptProvider({ accessToken: 'token', model: 'account-model' });
  expect(result).toMatchObject({ modelId: 'account-model' });
  expect(result.languageModel.provider).toBe('openai.responses');
  expect(result.providerTools).toHaveProperty('web_search');
});
test('sends the personal token only to the fixed public Responses endpoint', async () => {
  const transport = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({
      id: 'resp_test',
      created_at: 1,
      model: 'account-model',
      object: 'response',
      status: 'completed',
      output: [],
      usage: { input_tokens: 1, output_tokens: 0, total_tokens: 1 }
    })
  );
  const { languageModel } = configuredChatGptProvider({
    accessToken: 'personal-token',
    model: 'account-model',
    fetch: transport
  });
  await languageModel.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
  });
  const [url, init] = transport.mock.calls[0]!;
  expect(String(url)).toBe('https://api.openai.com/v1/responses');
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer personal-token');
  expect(JSON.parse(init?.body as string).model).toBe('account-model');
});

test('sends the requested research search context through the Responses transport', async () => {
  const transport = vi.fn(async () =>
    Response.json({
      id: 'resp_research',
      created_at: 1,
      model: 'account-model',
      object: 'response',
      status: 'completed',
      output: [
        {
          id: 'ws_1',
          type: 'web_search_call',
          status: 'completed',
          action: { type: 'search', query: 'official tourism' }
        },
        {
          id: 'msg_1',
          type: 'message',
          status: 'completed',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Source evidence', annotations: [] }]
        }
      ],
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
    })
  );
  const configuration = configuredChatGptProvider({
    accessToken: 'token',
    model: 'account-model',
    fetch: transport,
    searchContextSize: 'high'
  });
  await generateText({
    model: configuration.languageModel,
    tools: configuration.providerTools,
    prompt: 'Research a topic',
    toolChoice: 'required'
  });
  const request = chatGptRequest(
    JSON.parse((transport.mock.calls as unknown as [unknown, RequestInit][])[0]![1].body as string)
  );
  expect(request.tools).toContainEqual(
    expect.objectContaining({
      type: 'web_search',
      search_context_size: 'high',
      external_web_access: true
    })
  );
  expect(request.tool_choice).toBe('required');
});
