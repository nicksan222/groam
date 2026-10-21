import { emailRelayHeaders, verifyEmailRelay } from '@groam/backend/convex/modules/auth/relay';
import { defineHandler } from 'void';
import { sendEmail } from 'void/email';
import { env } from 'void/env';
import { z } from 'zod';

const relayMessage = z.object({
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(20_000),
  to: z.email()
});

/**
 * Sends authentication mail for Convex (packages/backend/convex/modules/auth/email.ts) through
 * Void email. Requests must be signed with the shared relay secret; responses never echo the
 * message or provider details.
 */
export const POST = defineHandler(async (c) => {
  const body = await c.req.text();
  const signed = await verifyEmailRelay(String(env.AUTH_EMAIL_RELAY_SECRET ?? ''), body, {
    signature: c.req.header(emailRelayHeaders.signature),
    timestamp: c.req.header(emailRelayHeaders.timestamp)
  });
  if (!signed) return c.json({ error: 'unauthorized' }, 401);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return c.json({ error: 'invalid message' }, 400);
  }
  const message = relayMessage.safeParse(payload);
  if (!message.success) return c.json({ error: 'invalid message' }, 400);
  const result = await sendEmail(message.data);
  if (!result.ok) {
    const code = 'error' in result ? result.error.code : 'RECIPIENT_FAILED';
    console.error('Authentication email was not accepted', code);
    return c.json({ error: 'not sent' }, 502);
  }
  return c.json({ ok: true });
});
