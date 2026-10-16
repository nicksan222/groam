const unsupportedFields = [
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
] as const;
const namespace = 'groam';
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid ChatGPT request item.');
  return value as ObjectValue;
}
function localTool(value: unknown): ObjectValue {
  const tool = object(value);
  if (
    (tool.type !== 'function' && tool.type !== 'custom') ||
    typeof tool.name !== 'string' ||
    !tool.name
  ) {
    throw new Error(
      'ChatGPT plan usage supports local function/custom tools and web search. Disable unsupported hosted tools.'
    );
  }
  return tool;
}
function tools(value: unknown): { tools?: ObjectValue[]; namespaces: Map<string, string> } {
  const namespaces = new Map<string, string>();
  if (value === undefined) return { namespaces };
  if (!Array.isArray(value)) throw new Error('Invalid ChatGPT tool configuration.');
  const result: ObjectValue[] = [];
  const flat: ObjectValue[] = [];
  for (const entry of value) {
    const tool = object(entry);
    if (
      ['web_search', 'web_search_preview', 'web_search_preview_2025_03_11'].includes(
        String(tool.type)
      )
    ) {
      result.push(tool);
    } else if (tool.type === 'namespace') {
      const group = toolNamespace(tool);
      for (const member of group.tools as ObjectValue[])
        namespaces.set(member.name as string, tool.name as string);
      result.push(group);
    } else {
      const member = localTool(tool);
      namespaces.set(member.name as string, namespace);
      flat.push(member);
    }
  }
  if (flat.length) {
    const existing = result.find((tool) => tool.type === 'namespace' && tool.name === namespace);
    if (existing) existing.tools = [...(existing.tools as ObjectValue[]), ...flat];
    else
      result.push({
        type: 'namespace',
        name: namespace,
        description: 'Groam trip planning tools',
        tools: flat
      });
  }
  return { tools: result, namespaces };
}
function input(value: unknown, namespaces: Map<string, string>): ObjectValue[] {
  if (typeof value === 'string')
    return [{ role: 'user', content: [{ type: 'input_text', text: value }] }];
  if (value === undefined) return [];
  if (!Array.isArray(value))
    throw new Error('ChatGPT request input must contain conversation history.');
  return value.map((entry) => {
    const item = object(entry);
    if (item.type === 'function_call' || item.type === 'custom_tool_call') {
      const toolNamespace = typeof item.name === 'string' ? namespaces.get(item.name) : undefined;
      return toolNamespace && !item.namespace ? { ...item, namespace: toolNamespace } : item;
    }
    if (item.type === 'additional_tools') {
      return { ...item, tools: tools(item.tools).tools ?? [] };
    }
    validateContent(item.content);
    return item.role === 'system' ? { ...item, role: 'developer' } : item;
  });
}
function toolChoice(value: unknown): unknown {
  if (value === undefined || typeof value === 'string') return value;
  const choice = object(value);
  if (choice.type === 'allowed_tools') {
    throw new Error(
      'ChatGPT plan usage does not support allowed_tools selection. Choose auto, required, or a specific local tool instead.'
    );
  }
  if (
    [
      'function',
      'custom',
      'web_search',
      'web_search_preview',
      'web_search_preview_2025_03_11'
    ].includes(String(choice.type))
  )
    return choice;
  throw new Error(
    'This tool choice is unavailable with ChatGPT plan usage. Choose a local function/custom tool or web search.'
  );
}
/** Adapt AI SDK Responses requests to the current ChatGPT plan preview contract. */
export function chatGptRequest(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload };
  for (const field of unsupportedFields) delete normalized[field];
  const configured = tools(payload.tools);
  normalized.input = input(payload.input, configured.namespaces);
  if (configured.tools) normalized.tools = configured.tools;
  if (payload.tool_choice !== undefined) normalized.tool_choice = toolChoice(payload.tool_choice);
  return { ...normalized, store: false, stream: true };
}

function toolNamespace(tool: ObjectValue): ObjectValue {
  if (typeof tool.name !== 'string' || !tool.name || !Array.isArray(tool.tools))
    throw new Error('Invalid ChatGPT tool namespace.');
  return { ...tool, tools: tool.tools.map(localTool) };
}
function validateContent(value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const content of value) {
    const part = object(content);
    if (['input_audio', 'input_video', 'audio', 'video'].includes(String(part.type)))
      throw new Error(
        'ChatGPT plan usage supports text, images, and files. Audio and video input are unavailable.'
      );
  }
}
