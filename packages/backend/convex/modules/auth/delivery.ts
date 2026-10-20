import { z } from 'zod';

const deliveryResponse = z.object({
  success: z.boolean(),
  result: z
    .object({
      delivered: z.array(z.string()),
      queued: z.array(z.string()),
      permanent_bounces: z.array(z.string())
    })
    .nullable()
    .optional()
});

/** Send only from a Convex action. Never include provider responses or links in errors. */
export async function deliverAuthEmail(
  configuration: { accountId: string; apiToken: string; from: string },
  message: { to: string; subject: string; text: string }
) {
  if (!/^[a-f0-9]{32}$/u.test(configuration.accountId))
    throw new Error('Invalid Cloudflare account ID');
  const endpoint = new URL('https://api.cloudflare.com/client/v4/accounts/');
  endpoint.pathname += `${configuration.accountId}/email/sending/send`;
  // fallow-ignore-next-line security-sink -- fixed HTTPS Cloudflare origin, validated account ID path, redirects refused
  const response = await fetch(endpoint.href, {
    method: 'POST',
    redirect: 'error',
    headers: {
      authorization: `Bearer ${configuration.apiToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ...message, from: configuration.from }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error('Authentication email delivery failed');
  const parsed = deliveryResponse.safeParse(await response.json());
  if (
    !parsed.success ||
    !parsed.data.success ||
    !parsed.data.result ||
    parsed.data.result.permanent_bounces.length > 0 ||
    ![...parsed.data.result.delivered, ...parsed.data.result.queued].includes(message.to)
  ) {
    throw new Error('Authentication email delivery failed');
  }
}

export function requiresVerifiedEmail(siteUrl: string) {
  return !new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(siteUrl).hostname);
}
