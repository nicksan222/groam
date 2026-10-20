import { expect, test } from 'vite-plus/test';
import { chatGptRequest } from './request';

test('removes preview-forbidden options and supplies full array context with developer instructions', () => {
  const forbidden = [
    'background',
    'conversation',
    'max_output_tokens',
    'max_tool_calls',
    'metadata',
    'moderation',
    'multi_agent',
    'prompt',
    'prompt_cache_retention',
    'safety_identifier',
    'temperature',
    'top_logprobs',
    'top_p',
    'truncation',
    'user',
    'previous_response_id'
  ];
  const input = [
    { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'Help plan trips' }] },
    { role: 'user', content: 'Visit Rome' }
  ];
  const result = chatGptRequest({
    ...Object.fromEntries(forbidden.map((key) => [key, 'unsupported'])),
    input,
    store: true,
    stream: false,
    model: 'account-model'
  });
  for (const key of forbidden) expect(result).not.toHaveProperty(key);
  expect(result).toMatchObject({
    store: false,
    stream: true,
    input: [
      {
        type: 'message',
        role: 'developer',
        content: [{ type: 'input_text', text: 'Help plan trips' }]
      },
      { role: 'user', content: 'Visit Rome' }
    ]
  });
  expect(input[0]?.role).toBe('system');
  expect(chatGptRequest({ input: 'Hello' }).input).toEqual([
    { role: 'user', content: [{ type: 'input_text', text: 'Hello' }] }
  ]);
});
test('namespaces function/custom tools and their history while preserving forced choice schema and web search', () => {
  const fn = { type: 'function', name: 'trip', parameters: { type: 'object' }, strict: true };
  const custom = { type: 'custom', name: 'edit', format: { type: 'text' } };
  const web = { type: 'web_search' };
  const result = chatGptRequest({
    tools: [fn, custom, web],
    input: [
      { type: 'function_call', name: 'trip', call_id: 'c1', arguments: '{}' },
      { type: 'custom_tool_call', name: 'edit', call_id: 'c2', input: 'x' },
      { type: 'function_call_output', call_id: 'c1', output: 'ok' }
    ],
    tool_choice: { type: 'function', name: 'trip' }
  });
  expect(result.tools).toEqual([
    web,
    {
      type: 'namespace',
      name: 'groam',
      description: 'Groam trip planning tools',
      tools: [fn, custom]
    }
  ]);
  expect(result.input).toEqual([
    { type: 'function_call', name: 'trip', call_id: 'c1', arguments: '{}', namespace: 'groam' },
    { type: 'custom_tool_call', name: 'edit', call_id: 'c2', input: 'x', namespace: 'groam' },
    { type: 'function_call_output', call_id: 'c1', output: 'ok' }
  ]);
  expect(result.tool_choice).toEqual({ type: 'function', name: 'trip' });
});
test('retains existing namespaces and supports additional_tools with local functions', () => {
  const tool = { type: 'function', name: 'lookup', parameters: { type: 'object' } };
  const group = { type: 'namespace', name: 'existing', description: 'Existing', tools: [tool] };
  const result = chatGptRequest({
    tools: [group],
    input: [
      { type: 'function_call', name: 'lookup', namespace: 'existing', arguments: '{}' },
      { type: 'additional_tools', tools: [tool] }
    ]
  });
  expect(result.tools).toEqual([group]);
  expect(result.input).toEqual([
    { type: 'function_call', name: 'lookup', namespace: 'existing', arguments: '{}' },
    {
      type: 'additional_tools',
      tools: [
        {
          type: 'namespace',
          name: 'groam',
          description: 'Groam trip planning tools',
          tools: [tool]
        }
      ]
    }
  ]);
});
test('rejects every unsupported hosted tool and tool choice before sending requests', () => {
  for (const type of [
    'image_generation',
    'file_search',
    'code_interpreter',
    'computer',
    'computer_use_preview',
    'mcp',
    'tool_search',
    'programmatic_tool_calling'
  ]) {
    expect(() => chatGptRequest({ tools: [{ type }] })).toThrow('Disable unsupported hosted tools');
    expect(() => chatGptRequest({ tool_choice: { type } })).toThrow('unavailable');
    expect(() =>
      chatGptRequest({ tools: [{ type: 'namespace', name: 'bad', tools: [{ type }] }] })
    ).toThrow('Disable unsupported hosted tools');
  }
  expect(() =>
    chatGptRequest({ input: [{ role: 'user', content: [{ type: 'input_audio' }] }] })
  ).toThrow('Audio and video');
});

test('rejects allowed_tools selectors that cannot target wrapped local tool namespaces', () => {
  expect(() =>
    chatGptRequest({
      tools: [{ type: 'function', name: 'trip', parameters: { type: 'object' } }],
      tool_choice: {
        type: 'allowed_tools',
        mode: 'required',
        tools: [{ type: 'function', name: 'trip' }]
      }
    })
  ).toThrow('Choose auto, required, or a specific local tool');
});

test('required selection remains valid when the researcher has one namespaced local tool', () => {
  const result = chatGptRequest({
    tools: [{ type: 'function', name: 'researchWeb', parameters: { type: 'object' } }],
    input: 'Research this topic',
    tool_choice: 'required'
  });
  expect(result.tool_choice).toBe('required');
  expect(result.tools).toEqual([
    expect.objectContaining({
      type: 'namespace',
      name: 'groam',
      tools: [expect.objectContaining({ name: 'researchWeb' })]
    })
  ]);
});
