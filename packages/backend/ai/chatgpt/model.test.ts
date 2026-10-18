import { expect, test, vi } from 'vite-plus/test';
import { configuredChatGptProvider } from './model';

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
