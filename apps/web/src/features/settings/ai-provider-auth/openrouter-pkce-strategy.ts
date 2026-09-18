import type { AiProviderAuthSessionData, AiProviderAuthStrategy } from '@/types/ai-provider-auth';

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/auth';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/auth/keys';

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function apiKey(body: unknown) {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('key' in body) ||
    typeof body.key !== 'string' ||
    !body.key
  ) {
    throw new Error('OpenRouter did not return an API key. Try again.');
  }
  return body.key;
}

export class OpenRouterPkceStrategy implements AiProviderAuthStrategy {
  readonly connectLabel = 'Connect OpenRouter';
  readonly connectedMessage = 'OpenRouter connected.';
  readonly provider = 'openrouter' as const;

  async begin(callbackUrl: string) {
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const url = new URL(OPENROUTER_AUTH_URL);
    url.searchParams.set('callback_url', callbackUrl);
    url.searchParams.set('code_challenge', base64Url(new Uint8Array(digest)));
    url.searchParams.set('code_challenge_method', 'S256');
    return { authorizationUrl: url.toString(), data: { verifier } };
  }

  async complete(callbackUrl: URL, data: AiProviderAuthSessionData) {
    const code = callbackUrl.searchParams.get('code');
    if (!code) throw new Error('The OpenRouter callback is missing its authorization code.');
    const verifier = data.verifier;
    if (!verifier) throw new Error('The OpenRouter connection expired. Try again.');
    const response = await fetch(OPENROUTER_KEY_URL, {
      body: JSON.stringify({ code, code_challenge_method: 'S256', code_verifier: verifier }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });
    if (!response.ok) throw new Error('OpenRouter could not complete the connection. Try again.');
    return apiKey(await response.json());
  }

  clearCallback(callbackUrl: URL) {
    callbackUrl.searchParams.delete('code');
  }

  hasCallback(callbackUrl: URL) {
    return callbackUrl.searchParams.has('code');
  }
}
