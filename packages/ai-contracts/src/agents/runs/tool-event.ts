const JSON_LIMIT = 2_000;

export type AgentRunToolEventDraft = {
  input?: string;
  label: string;
  ok: boolean;
  output?: string;
  toolName: string;
};

/** Human-readable run-log copy derived from a tool's stable runtime name. */
export function catalogToolLabel(tool: string): { complete: string; running: string } {
  return conventionalToolLabel(tool);
}

export function conventionalToolLabel(tool: string): { complete: string; running: string } {
  const humanized = tool
    .replace(/_/gu, ' ')
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .toLocaleLowerCase();
  const match = /^(add|create|find|get|set) (.+)$/u.exec(humanized);
  if (!match) return { complete: `Used ${humanized}`, running: `Using ${humanized}` };
  const [, verb, subject] = match;
  const forms: Record<string, { complete: string; running: string }> = {
    add: { complete: 'Added', running: 'Adding' },
    create: { complete: 'Created', running: 'Creating' },
    find: { complete: 'Found', running: 'Finding' },
    get: { complete: 'Read', running: 'Reading' },
    set: { complete: 'Updated', running: 'Updating' }
  };
  const form = forms[verb ?? ''];
  return form
    ? { complete: `${form.complete} ${subject}`, running: `${form.running} ${subject}` }
    : { complete: `Used ${humanized}`, running: `Using ${humanized}` };
}

export function toolEventFromResult(result: {
  args?: unknown;
  error?: unknown;
  input?: unknown;
  isError?: boolean;
  output?: unknown;
  result?: unknown;
  toolName?: string;
  type?: string;
}): AgentRunToolEventDraft {
  const toolName =
    typeof result.toolName === 'string' && result.toolName.length > 0 ? result.toolName : 'tool';
  const ok = result.isError !== true && result.type !== 'tool-error' && result.error == null;
  const labels = catalogToolLabel(toolName);
  const input = truncateJson(result.input ?? result.args);
  const output = truncateJson(result.error ?? result.output ?? result.result);
  return {
    ...(input ? { input } : {}),
    label: ok ? labels.complete : `Failed while ${labels.running.toLocaleLowerCase()}`,
    ok,
    ...(output ? { output } : {}),
    toolName
  };
}

export function truncateJson(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text.length <= JSON_LIMIT) return text;
  return `${text.slice(0, JSON_LIMIT)}…`;
}
