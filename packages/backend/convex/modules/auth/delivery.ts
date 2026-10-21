import { z } from 'zod';
import { emailRelayHeaders, emailRelayPath, signEmailRelay } from './relay';

const relayResponse = z.object({ ok: z.literal(true) });

/**
 * Send only from a Convex action. The Void Worker at the frontend origin sends the message with
 * `void/email`. Never include relay responses or links in errors.
 */
export async function deliverAuthEmail(
  configuration: { siteUrl: string; relaySecret: string },
  message: { to: string; subject: string; text: string }
) {
  const endpoint = new URL(emailRelayPath, configuration.siteUrl);
  if (endpoint.origin !== new URL(configuration.siteUrl).origin)
    throw new Error('Invalid email relay origin');
  const body = JSON.stringify(message);
  const timestamp = Date.now();
  // fallow-ignore-next-line security-sink -- fixed path on the configured frontend origin, redirects refused
  const response = await fetch(endpoint.href, {
    method: 'POST',
    redirect: 'error',
    headers: {
      'content-type': 'application/json',
      [emailRelayHeaders.signature]: await signEmailRelay(
        configuration.relaySecret,
        body,
        timestamp
      ),
      [emailRelayHeaders.timestamp]: String(timestamp)
    },
    body,
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error('Authentication email delivery failed');
  if (!relayResponse.safeParse(await response.json().catch(() => null)).success)
    throw new Error('Authentication email delivery failed');
}

export function requiresVerifiedEmail(siteUrl: string) {
  return !new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(siteUrl).hostname);
}
