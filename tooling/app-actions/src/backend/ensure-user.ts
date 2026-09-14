import type { BackendSession } from './backend-session';
import { authRequest } from './better-auth-request';
import { asObject, assertResponse, requiredString, responseJson } from './better-auth-response';

export type AppUserProfile = {
  email: string;
  name: string;
  password: string;
};

export type AppUser = AppUserProfile & { userId: string };

export type AuthenticatedAppUser = AppUser & {
  cookie: string;
  status: 'created' | 'existing';
};

const EXISTING_USER_SIGN_UP_STATUSES = new Set([409, 422]);

function sessionCookie(response: Response): string {
  const cookies = response.headers.getSetCookie();
  if (cookies.length === 0) throw new Error('Better Auth did not return a session cookie');
  return cookies.map((value) => value.split(';', 1)[0]).join('; ');
}

export async function ensureUser(
  backend: BackendSession,
  profile: AppUserProfile
): Promise<AuthenticatedAppUser> {
  const authUrl = new URL('/api/auth/', backend.config.siteUrl);
  const signUp = await authRequest(backend, new URL('sign-up/email', authUrl), {
    email: profile.email,
    name: profile.name,
    password: profile.password
  });
  let status: AuthenticatedAppUser['status'] = 'created';
  let sessionResponse = signUp;
  if (!signUp.ok) {
    if (!EXISTING_USER_SIGN_UP_STATUSES.has(signUp.status)) {
      await assertResponse(signUp, `create ${profile.email}`);
    }
    status = 'existing';
    sessionResponse = await authRequest(backend, new URL('sign-in/email', authUrl), {
      email: profile.email,
      password: profile.password
    });
  }

  if (!sessionResponse.ok) {
    throw new Error(
      `Unable to create or verify ${profile.email} (${signUp.status}/${sessionResponse.status})`
    );
  }

  const body = asObject(await responseJson(sessionResponse, 'user session'), 'user session');
  const user = asObject(body.user, 'user');
  return {
    ...profile,
    cookie: sessionCookie(sessionResponse),
    status,
    userId: requiredString(user.id, 'user id')
  };
}
