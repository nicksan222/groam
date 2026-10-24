import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { canSendEmail } from '#convex/modules/auth/verification';

/**
 * Whether this deployment can deliver authentication email (Resend is optional). The sign-in
 * screen and Settings use it to hide password reset, verification, and email-change options that
 * would wait on a link that never arrives. Public: it reveals no more than the missing option.
 */
export const run = query({
  args: {},
  returns: v.boolean(),
  handler: async () => canSendEmail()
});
