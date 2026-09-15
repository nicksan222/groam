import type { BackendActionsConfig } from './backend-session';
import type { AuthenticatedAppUser } from './ensure-user';
import type { AppWorkspace } from './ensure-workspace';

export const testEmail = 'demo@groam.example';
export const testPassword = 'GroamDemo123!';

export const backendConfig: BackendActionsConfig = {
  convexUrl: 'http://127.0.0.1:3214',
  siteUrl: 'http://127.0.0.1:3215'
};

export const owner: AuthenticatedAppUser = {
  cookie: 'better-auth.session_token=owner-token',
  email: testEmail,
  name: 'Groam Demo',
  password: testPassword,
  status: 'existing',
  userId: 'user-owner'
};

export const member: AuthenticatedAppUser = {
  cookie: 'better-auth.session_token=member-token',
  email: 'traveler.001@groam.example',
  name: 'Avery Morgan',
  password: testPassword,
  status: 'created',
  userId: 'user-member'
};

export const workspace: AppWorkspace = {
  organizationId: 'organization-a',
  organizationName: 'Groam Demo',
  owner
};

export function jsonResponse(body: unknown, status = 200, cookie?: string): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { 'Set-Cookie': cookie } : {})
    },
    status
  });
}

export function requestUrl(input: RequestInfo | URL | undefined): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  throw new Error('Expected fetch to receive a request URL');
}

export function requestBody(call: Parameters<typeof fetch> | undefined): unknown {
  const body = call?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(body);
}
