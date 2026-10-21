import type { VariableName } from '@groam/env/deployment';
import type { ReleaseTarget } from '#src/release/target';

const api = new URL('https://api.cloudflare.com/client/v4/');

/** The token a release already has; preflight reads Worker secret names with it, never values. */
const tokenName = 'CLOUDFLARE_API_TOKEN' satisfies VariableName<'github'>;

/** Calls the Cloudflare API; each path segment is encoded, and the host can only be Cloudflare's. */
async function cloudflare(...segments: string[]): Promise<unknown> {
  const url = new URL(segments.map(encodeURIComponent).join('/'), api);
  if (url.origin !== api.origin) throw new Error('Refusing a non-Cloudflare API request.');
  // fallow-ignore-next-line security-sink -- fixed Cloudflare origin, rechecked above; segments are encoded committed config or Cloudflare IDs
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${process.env[tokenName] ?? ''}` }
  });
  if (!response.ok)
    throw new Error(`Cloudflare ${segments[0]} request failed (${response.status}).`);
  const body = (await response.json()) as {
    success?: boolean;
    result?: unknown;
    errors?: { message?: string }[];
  };
  if (!body.success)
    throw new Error(
      `Cloudflare ${segments[0]} request failed: ${body.errors?.map((e) => e.message).join('; ') ?? 'no details'}`
    );
  return body.result;
}

async function accountId(target: ReleaseTarget): Promise<string> {
  if (target.cloudflareAccountId) return target.cloudflareAccountId;
  const accounts = (await cloudflare('accounts')) as { id: string }[];
  if (accounts.length !== 1)
    throw new Error('The token reaches several Cloudflare accounts; set cloudflareAccountId.');
  return accounts[0]?.id ?? '';
}

/** Names of the secrets set on the web app's Worker. */
export async function workerSecretNames(target: ReleaseTarget): Promise<Set<string>> {
  const account = await accountId(target);
  const secrets = (await cloudflare(
    'accounts',
    account,
    'workers',
    'scripts',
    target.workers.web,
    'secrets'
  )) as { name: string }[];
  return new Set(secrets.map(({ name }) => name));
}
