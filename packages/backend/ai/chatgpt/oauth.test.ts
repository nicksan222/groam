import { afterEach, expect, test, vi } from 'vite-plus/test';
import { createAuthorization, listModels, refreshAuthorization } from './oauth';
const discovery = {
  issuer: 'https://auth.openai.com',
  authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize',
  token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token',
  jwks_uri: 'https://auth.openai.com/.well-known/jwks.json'
};
afterEach(() => vi.unstubAllGlobals());
test('creates fresh PKCE and rejects arbitrary callback endpoints', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(discovery))
  );
  const result = await createAuthorization({
    hostId: 'host',
    redirectUri: 'http://127.0.0.1:1455/auth/chatgpt/callback'
  });
  const url = new URL(result.authorizationUrl);
  expect(url.searchParams.get('client_id')).toBe('dynamic_agent_client');
  expect(url.searchParams.get('agent_name_hint')).toBe('Groam');
  expect(url.searchParams.get('code_challenge')).not.toBe(result.verifier);
  expect(result.state).not.toBe(result.nonce);
  await expect(
    createAuthorization({ hostId: 'host', redirectUri: 'https://evil.test/callback' })
  ).rejects.toThrow('ChatGPT authorization failed');
});
test('refresh retains omitted fields and rotates returned refresh token', async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(discovery))
    .mockResolvedValueOnce(
      Response.json({
        access_token: 'new',
        refresh_token: 'rotated',
        token_type: 'Bearer',
        expires_in: 3600
      })
    );
  vi.stubGlobal('fetch', mock);
  const scopes = 'resource.invoke chatgpt.tokens.use.direct';
  expect(
    await refreshAuthorization({
      clientId: 'oaiapp_test',
      refreshToken: 'old',
      idToken: 'saved',
      scopes
    })
  ).toEqual(
    expect.objectContaining({
      accessToken: 'new',
      refreshToken: 'rotated',
      idToken: 'saved',
      scopes
    })
  );
  mock.mockResolvedValueOnce(Response.json(discovery)).mockResolvedValueOnce(
    Response.json({
      access_token: 'secret',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid'
    })
  );
  await expect(
    refreshAuthorization({ clientId: 'oaiapp_test', refreshToken: 'old', idToken: 'saved', scopes })
  ).rejects.toThrow('ChatGPT authorization failed');
});
test('rejects discovery substitution and preserves visible catalog order', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ ...discovery, jwks_uri: 'https://evil.test/keys' }))
  );
  await expect(
    createAuthorization({
      hostId: 'host',
      redirectUri: 'http://127.0.0.1:1455/auth/chatgpt/callback'
    })
  ).rejects.toThrow('ChatGPT authorization failed');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        models: [
          { slug: 'b', display_name: 'Bee', visibility: 'list' },
          { slug: 'hidden', visibility: 'hidden' },
          { slug: 'a', display_name: 'Ay', visibility: 'list' }
        ]
      })
    )
  );
  expect(await listModels('secret')).toEqual([
    { slug: 'b', displayName: 'Bee' },
    { slug: 'a', displayName: 'Ay' }
  ]);
});

test('verifies OpenAI signature, issuer, audience, expiry, and nonce before accepting identity', async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
  const { exchangeAuthorization } = await import('./oauth');
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256', use: 'sig' };
  const sign = (nonce: string, audience = 'oaiapp_test') =>
    new SignJWT({ nonce, email: 'person@example.test' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://auth.openai.com')
      .setAudience(audience)
      .setSubject('person')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  let idToken = await sign('expected');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('openid-configuration')) return Response.json(discovery);
      if (url.endsWith('jwks.json')) return Response.json({ keys: [jwk] });
      return Response.json({
        access_token: 'access',
        refresh_token: 'refresh',
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid resource.invoke chatgpt.tokens.use.direct'
      });
    })
  );
  const input = {
    code: 'code',
    clientId: 'oaiapp_test',
    redirectUri: 'http://127.0.0.1:1455/auth/chatgpt/callback',
    verifier: 'verifier',
    nonce: 'expected'
  };
  expect((await exchangeAuthorization(input)).identity).toEqual({
    subject: 'person',
    email: 'person@example.test'
  });
  idToken = await sign('wrong');
  await expect(exchangeAuthorization(input)).rejects.toThrow('ChatGPT authorization failed');
  idToken = await sign('expected', 'oaiapp_other');
  await expect(exchangeAuthorization(input)).rejects.toThrow('ChatGPT authorization failed');
});

test('distinguishes terminal refresh failures from transient server errors without disclosing bodies', async () => {
  const { ChatGptAuthorizationError } = await import('./oauth');
  const input = {
    clientId: 'oaiapp_test',
    refreshToken: 'secret',
    idToken: 'saved',
    scopes: 'resource.invoke chatgpt.tokens.use.direct'
  };
  for (const [status, reconnect] of [
    [400, true],
    [503, false]
  ] as const) {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(discovery))
      .mockResolvedValueOnce(
        Response.json({ error: 'invalid_grant', private: 'secret' }, { status })
      );
    vi.stubGlobal('fetch', mock);
    try {
      await refreshAuthorization(input);
      throw new Error('should reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthorizationError);
      expect((error as InstanceType<typeof ChatGptAuthorizationError>).reconnect).toBe(reconnect);
      expect((error as Error).message).not.toContain('secret');
    }
  }
});
