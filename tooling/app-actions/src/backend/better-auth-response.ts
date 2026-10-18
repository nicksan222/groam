export type JsonObject = Record<string, unknown>;

const MAX_AUTH_RESPONSE_BYTES = 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 16 * 1024;

async function responseText(response: Response, maximumBytes: number, description: string) {
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error(`Better Auth returned an oversized ${description}`);
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    byteLength += result.value.byteLength;
    if (byteLength > maximumBytes) {
      await reader.cancel();
      throw new Error(`Better Auth returned an oversized ${description}`);
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function responseJson(response: Response, description: string): Promise<unknown> {
  const text = await responseText(response, MAX_AUTH_RESPONSE_BYTES, description);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Better Auth returned invalid JSON for ${description}`);
  }
}

export function asObject(value: unknown, description: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Better Auth returned an invalid ${description}`);
  }
  return value as JsonObject;
}

export function requiredString(value: unknown, description: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Better Auth returned an invalid ${description}`);
  }
  return value;
}

export async function assertResponse(response: Response, operation: string): Promise<void> {
  if (response.ok) return;
  const detail = (await responseText(response, MAX_ERROR_RESPONSE_BYTES, 'error response'))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 500);
  throw new Error(`Unable to ${operation} (${response.status})${detail ? `: ${detail}` : ''}`);
}
