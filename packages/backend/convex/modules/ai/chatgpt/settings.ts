import { AI_DEMO_NOTICE } from '@groam/ai/backend/errors';
import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import { env, type MutationCtx, type QueryCtx } from '#convex-generated/server';
import { chatGptProfile, ownedChatGptConnection } from './storage';

/** Public dynamic registration requires a callback on this runtime's loopback listener. */
export function chatGptAvailability(siteUrl: string | undefined = env.CONVEX_SITE_URL) {
  try {
    const url = new URL(siteUrl ?? '');
    if (
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !!url.port
    ) {
      url.hostname = '127.0.0.1';
      url.pathname = '/auth/chatgpt/callback';
      url.search = '';
      url.hash = '';
      return { available: true, unavailableReason: null, redirectUri: url.toString() };
    }
  } catch {
    /* Invalid deployment configuration is unavailable. */
  }
  return {
    available: false,
    unavailableReason: AI_DEMO_NOTICE,
    redirectUri: null
  };
}
export async function publicChatGptSettings(ctx: QueryCtx, userId: string) {
  const [profile, records] = await Promise.all([
    chatGptProfile(ctx, userId),
    ctx.db
      .query('chatgptConnections')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  ]);
  const { available, unavailableReason } = chatGptAvailability();
  return {
    available,
    unavailableReason,
    activeConnectionId: profile?.activeConnectionId ?? null,
    planNoticeAcknowledged: profile?.planNoticeAcknowledged ?? false,
    connections: records.map((record) => ({
      id: record._id,
      label: record.label,
      email: record.email ?? null,
      clientId: record.clientId,
      connected: !!record.tokens && !record.needsReconnect,
      needsReconnect: record.needsReconnect,
      model: record.model ?? null
    }))
  };
}
export async function selectChatGptConnection(
  ctx: MutationCtx,
  userId: string,
  connectionId: Id<'chatgptConnections'>,
  model?: string
) {
  const record = await ownedChatGptConnection(ctx, userId, connectionId);
  if (!record.tokens || record.needsReconnect)
    throw new ConvexError('Reconnect this ChatGPT account before selecting it.');
  if (model !== undefined) {
    if (!model.trim() || model.length > 200) throw new ConvexError('Select a valid ChatGPT model.');
    // The account's live catalog is checked again before each inference request.
    await ctx.db.patch('chatgptConnections', record._id, { model });
  }
  const profile = await chatGptProfile(ctx, userId);
  if (!profile) throw new ConvexError('ChatGPT profile not found.');
  await ctx.db.patch('chatgptProfiles', profile._id, {
    activeConnectionId: record._id,
    generation: profile.generation + 1
  });
  return null;
}
export async function acknowledgeChatGptPlan(ctx: MutationCtx, userId: string) {
  const profile = await chatGptProfile(ctx, userId);
  if (!profile) throw new ConvexError('Connect ChatGPT first.');
  await ctx.db.patch('chatgptProfiles', profile._id, { planNoticeAcknowledged: true });
  return null;
}
