const REDACTED_MESSAGES = new Set(['An error occurred.', 'An error occurred']);

export const DEFAULT_ASSISTANT_FAILURE =
  'Groam AI could not complete that reply. Try again in a moment.';

export const UNCONFIGURED_ASSISTANT =
  'Groam AI is not configured. Add an API key in Settings → AI.';

const PROVIDER_PREFIX = 'The model provider said: ';
const MAX_FORWARDED_MESSAGE = 400;
const CREDITS_FALLBACK =
  'Groam AI is temporarily unavailable because the model provider is out of credits. Try again later or ask with a shorter message.';

function isOpaqueServerWrapper(message: string): boolean {
  return (
    /\[CONVEX\s+[A-Z]/g.test(message) ||
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

function collectCandidates(value: unknown, depth: number, seen: Set<unknown>, out: string[]): void {
  if (depth > 6 || value == null || seen.has(value)) return;
  if (typeof value === 'string') {
    const fromJson = tryJsonErrorMessage(value);
    out.push(fromJson ?? value);
    return;
  }
  if (typeof value !== 'object') return;
  seen.add(value);
  const record = value as Record<string, unknown>;

  if ('data' in record) collectCandidates(record.data, depth + 1, seen, out);
  if ('error' in record && record.error !== value)
    collectCandidates(record.error, depth + 1, seen, out);
  if (typeof record.message === 'string') {
    const fromJson = tryJsonErrorMessage(record.message);
    out.push(fromJson ?? record.message);
  }
  if (typeof record.responseBody === 'string') {
    const fromJson = tryJsonErrorMessage(record.responseBody);
    if (fromJson) out.push(fromJson);
  }
  if ('cause' in record && record.cause !== value)
    collectCandidates(record.cause, depth + 1, seen, out);
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
    message === UNCONFIGURED_ASSISTANT
  );
}

function withProviderPrefix(message: string): string {
  if (isGroamAuthored(message)) return message;
  return `${PROVIDER_PREFIX}${message}`;
}

function hasPaymentRequiredStatus(
  error: unknown,
  depth = 0,
  seen: Set<unknown> = new Set()
): boolean {
  if (depth > 5 || typeof error !== 'object' || error === null || seen.has(error)) return false;
  seen.add(error);
  const record = error as {
    cause?: unknown;
    data?: unknown;
    error?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  if (record.statusCode === 402 || record.status === 402) return true;
  return (
    hasPaymentRequiredStatus(record.cause, depth + 1, seen) ||
    hasPaymentRequiredStatus(record.data, depth + 1, seen) ||
    hasPaymentRequiredStatus(record.error, depth + 1, seen)
  );
}

function looksUnconfigured(haystack: string): boolean {
  return (
    haystack.includes('not configured') ||
    haystack.includes('missing openai') ||
    haystack.includes('missing openrouter') ||
    haystack.includes('add openai_api_key') ||
    haystack.includes('add an api key')
  );
}

function looksLikeCreditFailure(error: unknown, haystack: string): boolean {
  return (
    hasPaymentRequiredStatus(error) ||
    haystack.includes('more credits') ||
    haystack.includes('out of credits') ||
    haystack.includes('can only afford') ||
    haystack.includes('insufficient') ||
    (haystack.includes('max_tokens') && haystack.includes('afford')) ||
    haystack.includes('quota') ||
    haystack.includes('billing') ||
    haystack.includes('payment required')
  );
}

function failureMessageForHaystack(haystack: string): string | null {
  const messages = [
    {
      message: 'Groam AI is busy right now. Wait a moment and try again.',
      matches: ['rate limit', 'too many requests', '429', 'capacity']
    },
    { message: UNCONFIGURED_ASSISTANT, matches: ['api key', 'invalid key'] },
    {
      message: 'Groam AI lost connection while replying. Try again in a moment.',
      matches: ['timeout', 'timed out', 'network', 'fetch failed', 'econnreset', 'socket']
    },
    {
      message:
        'That conversation is too long for Groam AI right now. Start a new chat or send a shorter message.',
      matches: ['context length', 'too long', 'maximum context']
    },
    {
      message: 'Groam AI could not reply to that message because of a provider safety check.',
      matches: ['moderation', 'content policy', 'safety']
    }
  ];
  return (
    messages.find(({ matches }) => matches.some((match) => haystack.includes(match)))?.message ??
    null
  );
}

/** Map provider/backend failures to traveler-facing copy, preferring the provider message. */
export function assistantFailureMessage(error: unknown): string {
  const candidates: string[] = [];
  collectCandidates(error, 0, new Set(), candidates);
  const forwarded = candidates
    .map(sanitizeFailureMessage)
    .find((value): value is string => value != null);
  const haystack = candidates.join('\n').toLowerCase();

  if (forwarded && looksUnconfigured(forwarded.toLowerCase())) return UNCONFIGURED_ASSISTANT;
  if (looksUnconfigured(haystack) && !forwarded) return UNCONFIGURED_ASSISTANT;

  if (forwarded) return withProviderPrefix(forwarded);

  if (looksLikeCreditFailure(error, haystack)) return CREDITS_FALLBACK;

  if (looksUnconfigured(haystack)) return UNCONFIGURED_ASSISTANT;
  return failureMessageForHaystack(haystack) ?? DEFAULT_ASSISTANT_FAILURE;
}
