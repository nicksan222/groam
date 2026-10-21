import { env } from '@groam/env/production';
import type { ReleaseTarget } from '#src/release/target';
import { lockedAccountId } from '#src/void/lock';

/**
 * Names (never values) of the secrets set on the web app's Worker. The account comes from
 * `cloudflareAccountId` or, when that is empty, from the environment's committed Void lock.
 */
export async function workerSecretNames(target: ReleaseTarget): Promise<Set<string>> {
  const worker = target.workers.web;
  const account = target.cloudflareAccountId || lockedAccountId(target.environment, 'web');
  if (!/^[a-f0-9]{32}$/u.test(account))
    throw new Error(
      `No Cloudflare account for the web Worker (${worker}): set cloudflareAccountId or commit its Void lock.`
    );
  if (!/^[a-z0-9-]+$/u.test(worker)) throw new Error(`Invalid Worker name "${worker}".`);
  const label = `web Worker (${worker}) secrets request failed`;
  // fallow-ignore-next-line security-sink -- fixed Cloudflare API origin; account and Worker are validated above
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/secrets`,
    { headers: { authorization: `Bearer ${env.cloudflareApiToken()}` }, redirect: 'error' }
  );
  if (!response.ok) throw new Error(`${label} (${response.status}).`);
  const body = (await response.json()) as {
    success?: boolean;
    result?: { name: string }[];
    errors?: { message?: string }[];
  };
  if (!body.success || !body.result)
    throw new Error(`${label}: ${body.errors?.map((e) => e.message).join('; ') || 'no details'}.`);
  return new Set(body.result.map(({ name }) => name));
}
