import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const ISSUER = 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const TIMEOUT = 15_000;
export type ChatGptTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  scopes: string;
};
type ChatGptIdentity = { subject: string; email?: string };

export class ChatGptAuthorizationError extends Error {
  constructor(readonly reconnect = false) {
    super('ChatGPT authorization failed. Please try again or reconnect your account.');
    this.name = 'ChatGptAuthorizationError';
  }
}
function fail(reconnect = false): never {
  throw new ChatGptAuthorizationError(reconnect);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 65_536) return fail();
  return value;
}
function client(value: string): string {
  if (!/^oaiapp_[a-zA-Z0-9_-]+$/.test(value)) return fail();
  return value;
}
function redirect(value: string): string {
  if (!/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}\/auth\/chatgpt\/callback$/.test(value))
    return fail();
  const url = new URL(value);
  if (Number(url.port) > 65535 || !url.port) return fail();
  return value;
}
function random(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!response.ok) {
      let terminal = response.status === 401 || response.status === 403;
      if (response.status === 400) {
        try {
          const body = record(await response.json());
          terminal = body.error === 'invalid_grant' || body.error === 'invalid_client';
        } catch {
          /* Never disclose server responses. */
        }
      }
      return fail(terminal);
    }
    return response;
  } catch (error) {
    if (error instanceof ChatGptAuthorizationError) throw error;
    return fail();
  }
}
async function json(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    return record(await (await request(url, init)).json());
  } catch (error) {
    if (error instanceof ChatGptAuthorizationError) throw error;
    return fail();
  }
}
async function discovery() {
  const config = await json(`${ISSUER}/.well-known/openid-configuration`);
  if (
    config.issuer !== ISSUER ||
    config.authorization_endpoint !== `${ISSUER}/api/accounts/authorize` ||
    config.token_endpoint !== `${ISSUER}/api/accounts/oauth/token` ||
    config.jwks_uri !== `${ISSUER}/.well-known/jwks.json`
  )
    return fail();
  return config;
}
async function identity(
  idToken: string,
  clientId: string,
  nonce?: string
): Promise<ChatGptIdentity> {
  try {
    const { payload } = await jwtVerify(
      idToken,
      createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), { timeoutDuration: TIMEOUT }),
      {
        issuer: ISSUER,
        audience: client(clientId),
        requiredClaims: ['sub', 'exp', 'iat'],
        algorithms: ['RS256', 'ES256'],
        clockTolerance: 5
      }
    );
    if (nonce !== undefined && payload.nonce !== nonce) return fail();
    return {
      subject: string(payload.sub),
      ...(typeof payload.email === 'string' ? { email: payload.email } : {})
    };
  } catch {
    return fail();
  }
}
function tokens(
  data: Record<string, unknown>,
  previous?: { refreshToken: string; idToken: string; scopes: string }
): ChatGptTokens {
  if (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
    return fail();
  const seconds = data.expires_in;
  if (
    typeof seconds !== 'number' ||
    !Number.isInteger(seconds) ||
    seconds <= 0 ||
    seconds > 31_536_000
  )
    return fail();
  const scopes = string(data.scope === undefined ? previous?.scopes : data.scope);
  const granted = new Set(scopes.split(/\s+/));
  if (!granted.has('chatgpt.tokens.use.direct') || !granted.has('resource.invoke')) return fail();
  return {
    accessToken: string(data.access_token),
    refreshToken: string(
      data.refresh_token === undefined ? previous?.refreshToken : data.refresh_token
    ),
    idToken: string(data.id_token === undefined ? previous?.idToken : data.id_token),
    scopes,
    expiresAt: Date.now() + seconds * 1000
  };
}
async function tokenRequest(form: Record<string, string>) {
  await discovery();
  return json(`${ISSUER}/api/accounts/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...form, resource: RESOURCE })
  });
}
export async function createAuthorization(input: {
  hostId: string;
  redirectUri: string;
  clientId?: string;
  idTokenHint?: string;
  loginHint?: string;
}) {
  await discovery();
  const state = random();
  const nonce = random();
  const verifier = random();
  const url = new URL(`${ISSUER}/api/accounts/authorize`);
  const params: Record<string, string> = {
    client_id: input.clientId ? client(input.clientId) : 'dynamic_agent_client',
    ext_agent_host_id: string(input.hostId),
    response_type: 'code',
    redirect_uri: redirect(input.redirectUri),
    scope: SCOPES,
    resource: RESOURCE,
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge: base64url(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    )
  };
  if (!input.clientId) params.agent_name_hint = 'Groam';
  if (input.clientId && input.idTokenHint) params.id_token_hint = string(input.idTokenHint);
  if (input.clientId && input.loginHint) params.login_hint = string(input.loginHint);
  url.search = new URLSearchParams(params).toString();
  return { authorizationUrl: url.toString(), state, nonce, verifier };
}
export async function exchangeAuthorization(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  verifier: string;
  nonce: string;
}) {
  const result = tokens(
    await tokenRequest({
      grant_type: 'authorization_code',
      client_id: client(input.clientId),
      code: string(input.code),
      redirect_uri: redirect(input.redirectUri),
      code_verifier: string(input.verifier)
    })
  );
  return {
    tokens: result,
    identity: await identity(result.idToken, input.clientId, string(input.nonce))
  };
}
export async function refreshAuthorization(input: {
  clientId: string;
  refreshToken: string;
  idToken: string;
  scopes: string;
}): Promise<ChatGptTokens> {
  const data = await tokenRequest({
    grant_type: 'refresh_token',
    client_id: client(input.clientId),
    refresh_token: string(input.refreshToken)
  });
  const result = tokens(data, input);
  if (data.id_token !== undefined) {
    const next = await identity(result.idToken, input.clientId);
    try {
      if (decodeJwt(input.idToken).sub !== next.subject) return fail();
    } catch {
      return fail();
    }
  }
  return result;
}
export async function revokeAuthorization(input: {
  clientId: string;
  refreshToken: string;
}): Promise<boolean> {
  try {
    const config = await discovery();
    const endpoint = new URL(string(config.revocation_endpoint));
    if (endpoint.origin !== ISSUER || endpoint.username || endpoint.password || endpoint.hash)
      return false;
    const response = await request(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client(input.clientId),
        token: string(input.refreshToken),
        token_type_hint: 'refresh_token'
      })
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
export async function listModels(
  accessToken: string
): Promise<Array<{ slug: string; displayName: string }>> {
  const result = await json(`${RESOURCE}/models`, {
    headers: { Authorization: `Bearer ${string(accessToken)}` }
  });
  if (!Array.isArray(result.models)) return fail();
  return result.models
    .map(record)
    .filter((model) => model.visibility === 'list')
    .map((model) => ({ slug: string(model.slug), displayName: string(model.display_name) }));
}
