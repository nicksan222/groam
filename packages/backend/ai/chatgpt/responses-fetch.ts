import { chatGptRequest } from './request';

/** ChatGPT plan inference always streams upstream and disables storage. */
export async function chatGptFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const request = new Request(input, init);
  if (request.url !== 'https://api.openai.com/v1/responses' || request.method !== 'POST')
    throw new Error('Unsupported ChatGPT inference endpoint.');
  const payload = (await request.json()) as Record<string, unknown>;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('Invalid ChatGPT inference request.');
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(chatGptRequest(payload)),
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(300_000)]),
    redirect: 'error'
  });
  if (!response.ok) return response;
  return payload.stream === true ? validatedStream(response) : collectResponse(response);
}

async function collectResponse(response: Response): Promise<Response> {
  // AI SDK doGenerate expects JSON; consume the upstream stream to completion.
  if (!response.body) throw new Error('ChatGPT response stream was interrupted.');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = '';
  try {
    while (true) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Stream chunks must be read and parsed in order.
      const { done, value } = await reader.read();
      pending += value ?? '';
      if (pending.length > 16_777_216)
        throw new Error('ChatGPT response event exceeded the size limit.');
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const event = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const completed = completedEvent(event);
        if (completed) return completed;
      }
      if (done) throw new Error('ChatGPT response stream was interrupted.');
    }
  } finally {
    await reader.cancel();
  }
}

function completedEvent(event: string): Response | undefined {
  const data = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!data || data === '[DONE]') return;
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(data) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid ChatGPT response event.');
  }
  if (
    message.type === 'response.completed' &&
    message.response &&
    typeof message.response === 'object'
  )
    return Response.json(message.response);
  if (
    message.type === 'response.failed' ||
    message.type === 'response.incomplete' ||
    message.type === 'error'
  )
    throw safeStreamError(message);
}

function validatedStream(response: Response): Response {
  if (!response.body) throw new Error('ChatGPT response stream was interrupted.');
  let pending = '';
  let completed = false;
  const validated = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, string>({
        transform(chunk, controller) {
          pending += chunk;
          if (pending.length > 16_777_216)
            throw new Error('ChatGPT response event exceeded the size limit.');
          let boundary: RegExpExecArray | null;
          while ((boundary = /\r?\n\r?\n/.exec(pending))) {
            const event = pending.slice(0, boundary.index);
            pending = pending.slice(boundary.index + boundary[0].length);
            if (completedEvent(event)) completed = true;
          }
          controller.enqueue(chunk);
        },
        flush() {
          if (!completed) throw new Error('ChatGPT response stream was interrupted.');
        }
      })
    )
    .pipeThrough(new TextEncoderStream());
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(validated, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const safeChatGptCodes = new Set([
  'subscription_sharing_usage_limit_exceeded',
  'subscription_sharing_usage_unavailable',
  'subscription_sharing_user_unavailable',
  'subscription_sharing_user_not_eligible',
  'subscription_sharing_unsupported_capability',
  'subscription_sharing_route_not_supported',
  'subscription_sharing_invalid_user',
  'chatpass_v2_scope_not_authorized',
  'chatpass_v2_invalid_authorization_context'
]);
function safeStreamError(message: Record<string, unknown>): Error {
  const response = message.response as Record<string, unknown> | undefined;
  const upstream = (response?.error ?? message.error ?? message) as
    | Record<string, unknown>
    | undefined;
  const code = upstream?.code;
  const error = new Error(
    'ChatGPT could not complete the response. Check your plan usage and reconnect if needed.'
  );
  return typeof code === 'string' && safeChatGptCodes.has(code)
    ? Object.assign(error, { code })
    : error;
}
