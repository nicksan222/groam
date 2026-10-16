const REDACTED_MESSAGES = new Set(['An error occurred', 'An error occurred.']);

export const DEFAULT_ASSISTANT_FAILURE =
  'Groam AI could not complete that reply. Try again in a moment.';

export const CHATGPT_RECONNECT = 'Reconnect ChatGPT in Settings → AI to continue using your plan.';

const PROVIDER_PREFIX = 'The model provider said: ';
const MAX_FORWARDED_MESSAGE = 400;

function isOpaqueServerWrapper(message: string): boolean {
  return (
    /\[CONVEX\s+[A-Z]/.test(message) ||
    /Server Error/i.test(message) ||
    /^Uncaught (?:Error|ConvexError):/i.test(message)
  );
}

function unwrapOpaqueWrapper(message: string): string | null {
  const match = message.match(/Uncaught (?:Error|ConvexError):\s*([\s\S]+)$/iu);
  const extracted = match?.[1]?.split('\n')[0]?.trim();
  if (!extracted || REDACTED_MESSAGES.has(extracted) || isOpaqueServerWrapper(extracted)) {
    return null;
  }
  return extracted;
}

function tryJsonErrorMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return pickJsonMessage(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function pickJsonMessage(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.error != null && record.error !== value) {
    const nested = pickJsonMessage(record.error, depth + 1);
    if (nested) return nested;
  }
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim();
  if (record.data != null) return pickJsonMessage(record.data, depth + 1);
  return null;
}

function collectJson(raw: string, depth: number, seen: Set<unknown>, out: string[]): void {
  try {
    collectCandidates(JSON.parse(raw), depth + 1, seen, out);
  } catch {
    /* Ignore diagnostic text that is not JSON. */
  }
}
function collectDiagnostics(record: Record<string, unknown>, out: string[]): void {
  if (typeof record.code === 'string') out.push(record.code);
  const status = record.statusCode ?? record.status;
  if (status === 401) out.push('chatgpt_unauthorized');
  if (status === 429) out.push('rate_limit_exceeded');
  if (record.reconnect === true) out.push('chatgpt_reconnect');
}
function collectCandidates(value: unknown, depth: number, seen: Set<unknown>, out: string[]): void {
  if (depth > 6 || value == null || seen.has(value)) return;
  if (typeof value === 'string') {
    out.push(tryJsonErrorMessage(value) ?? value);
    if (value.trim().startsWith('{')) collectJson(value, depth, seen, out);
    return;
  }
  if (typeof value !== 'object') return;
  seen.add(value);
  const record = value as Record<string, unknown>;
  for (const key of ['data', 'error', 'message', 'cause'])
    collectCandidates(record[key], depth + 1, seen, out);
  if (typeof record.responseBody === 'string') collectJson(record.responseBody, depth, seen, out);
  collectDiagnostics(record, out);
}

function sanitizeFailureMessage(text: string): string | null {
  let value = text.trim();
  if (!value) return null;
  if (isOpaqueServerWrapper(value)) {
    const unwrapped = unwrapOpaqueWrapper(value);
    if (!unwrapped) return null;
    value = unwrapped;
  }
  if (REDACTED_MESSAGES.has(value)) return null;
  value = value.replace(/^(?:AI_APICallError|APICallError):\s*/u, '');
  if (!value.trim() || REDACTED_MESSAGES.has(value.trim())) return null;
  if (/^\d{3}$/u.test(value.trim())) return null;
  if (
    value.length > 2000 &&
    (value.startsWith('{') || /"(?:messages|prompt|system)"/u.test(value))
  ) {
    return null;
  }
  value = value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/giu, 'Bearer [redacted]')
    .replace(/\b(api[_-]?key\s*[:=]\s*)\S+/giu, '$1[redacted]')
    .replace(
      /(["']?(?:access[_-]?token|refresh[_-]?token|id[_-]?token)["']?\s*[:=]\s*["']?)[^\s,;"']+/giu,
      '$1[redacted]'
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[redacted]')
    .replace(/\b(cookie\s*[:=]\s*)[^\s;]+/giu, '$1[redacted]');
  value = value.trim();
  if (!value) return null;
  if (value.length > MAX_FORWARDED_MESSAGE) return `${value.slice(0, MAX_FORWARDED_MESSAGE - 1)}…`;
  return value;
}

function isGroamAuthored(message: string): boolean {
  return (
    message.startsWith('Groam AI') ||
    message.startsWith(PROVIDER_PREFIX) ||
    message.startsWith('ChatGPT') ||
    message.startsWith('Reconnect ChatGPT') ||
    message.startsWith('Connect ChatGPT')
  );
}

function withProviderPrefix(message: string): string {
  if (isGroamAuthored(message)) return message;
  return `${PROVIDER_PREFIX}${message}`;
}

const FAILURE_MESSAGE_PATTERNS: readonly { matches: readonly string[]; message: string }[] = [
  {
    matches: ['subscription_sharing_usage_limit_exceeded'],
    message:
      'ChatGPT usage limit reached for this app. Review your limits in ChatGPT Settings → Usage before trying again.'
  },
  {
    matches: ['subscription_sharing_usage_unavailable', 'subscription_sharing_user_unavailable'],
    message: 'ChatGPT plan usage is temporarily unavailable. Try again later.'
  },
  {
    matches: ['subscription_sharing_user_not_eligible'],
    message:
      'ChatGPT plan usage is unavailable for this account or workspace. Check your ChatGPT plan and workspace policy.'
  },
  {
    matches: [
      'subscription_sharing_unsupported_capability',
      'subscription_sharing_route_not_supported'
    ],
    message:
      'ChatGPT does not support this request. Change the model or requested capability before trying again.'
  },
  {
    matches: ['chatpass_v2_scope_not_authorized', 'chatpass_v2_invalid_authorization_context'],
    message:
      'ChatGPT did not authorize this operation. Check the account connection and plan permissions in Settings → AI.'
  },
  {
    matches: [
      'chatgpt_reconnect',
      'chatgpt_unauthorized',
      'invalid_grant',
      'invalid_refresh_token',
      'refresh_token_expired',
      'refresh_token_invalidated',
      'refresh_token_reused',
      'subscription_sharing_invalid_user'
    ],
    message: CHATGPT_RECONNECT
  },
  {
    message: 'Groam AI is busy right now. Wait a moment and try again.',
    matches: ['rate limit', 'rate_limit', 'too many requests', '429', 'capacity']
  },
  {
    message: 'Groam AI lost connection while replying. Try again in a moment.',
    matches: ['timeout', 'timed out', 'network', 'fetch failed', 'econnreset', 'socket']
  },
  {
    message:
      'That conversation is too long for Groam AI right now. Start a new chat or send a shorter message.',
    matches: ['context length', 'context_length', 'too long', 'maximum context']
  },
  {
    message: 'Groam AI could not reply to that message because of a provider safety check.',
    matches: ['moderation', 'content policy', 'safety']
  }
];

function failureMessageForHaystack(haystack: string): string | null {
  return (
    FAILURE_MESSAGE_PATTERNS.find(({ matches }) =>
      matches.some((match) => haystack.includes(match))
    )?.message ?? null
  );
}

/** Map provider/backend failures to traveler-facing copy, preferring the provider message. */
export function assistantFailureMessage(error: unknown): string {
  const candidates: string[] = [];
  collectCandidates(error, 0, new Set(), candidates);
  let forwarded: string | undefined;
  for (const candidate of candidates) {
    const sanitized = sanitizeFailureMessage(candidate);
    if (sanitized != null) {
      forwarded = sanitized;
      break;
    }
  }
  const haystack = candidates.join('\n').toLowerCase();

  const mapped = failureMessageForHaystack(haystack);
  if (mapped) return mapped;
  if (forwarded) return withProviderPrefix(forwarded);
  return DEFAULT_ASSISTANT_FAILURE;
}
