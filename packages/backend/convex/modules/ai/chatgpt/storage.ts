import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx
} from '#convex-generated/server';
import { chatGptTokensValidator, chatGptTransactionFields } from './schema';

export async function chatGptProfile(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query('chatgptProfiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique();
}
export async function ownedChatGptConnection(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  connectionId: Id<'chatgptConnections'>
) {
  const connection = await ctx.db.get('chatgptConnections', connectionId);
  if (!connection || connection.userId !== userId)
    throw new ConvexError('ChatGPT connection not found.');
  return connection;
}
async function ensureProfile(ctx: MutationCtx, userId: string) {
  const existing = await chatGptProfile(ctx, userId);
  if (existing) return existing;
  const id = await ctx.db.insert('chatgptProfiles', {
    userId,
    planNoticeAcknowledged: false,
    generation: 0
  });
  const created = await ctx.db.get('chatgptProfiles', id);
  if (!created) throw new ConvexError('Unable to create ChatGPT profile.');
  return created;
}
export const prepare = internalMutation({
  args: {
    userId: v.string(),
    connectionId: v.optional(v.id('chatgptConnections')),
    newHostId: v.string()
  },
  handler: async (ctx, { userId, connectionId, newHostId }) => {
    const profile = await ensureProfile(ctx, userId);
    const connection = connectionId
      ? await ownedChatGptConnection(ctx, userId, connectionId)
      : null;
    const host = await ctx.db
      .query('chatgptHosts')
      .withIndex('by_key', (q) => q.eq('key', 'runtime'))
      .unique();
    if (!host) await ctx.db.insert('chatgptHosts', { key: 'runtime', hostId: newHostId });
    const generation = profile.generation + 1;
    await ctx.db.patch('chatgptProfiles', profile._id, { generation });
    const pending = await ctx.db
      .query('chatgptTransactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(
      pending.map((transaction) => ctx.db.delete('chatgptTransactions', transaction._id))
    );
    return { hostId: host?.hostId ?? newHostId, connection, generation };
  }
});
export const saveTransaction = internalMutation({
  args: chatGptTransactionFields,
  returns: v.null(),
  handler: async (ctx, transaction) => {
    const profile = await chatGptProfile(ctx, transaction.userId);
    if (profile?.generation !== transaction.generation)
      throw new ConvexError('A newer ChatGPT connection attempt has started.');
    await ctx.db.insert('chatgptTransactions', transaction);
    return null;
  }
});
export const consumeTransaction = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const transaction = await ctx.db
      .query('chatgptTransactions')
      .withIndex('by_state', (q) => q.eq('state', state))
      .unique();
    if (!transaction) return null;
    await ctx.db.delete('chatgptTransactions', transaction._id);
    const profile = await chatGptProfile(ctx, transaction.userId);
    if (transaction.expiresAt <= Date.now() || profile?.generation !== transaction.generation)
      return null;
    const connection = transaction.connectionId
      ? await ownedChatGptConnection(ctx, transaction.userId, transaction.connectionId)
      : null;
    return { transaction, connection };
  }
});
export const complete = internalMutation({
  args: {
    userId: v.string(),
    generation: v.number(),
    connectionId: v.optional(v.id('chatgptConnections')),
    clientId: v.string(),
    subject: v.string(),
    email: v.optional(v.string()),
    tokens: chatGptTokensValidator
  },
  returns: v.null(),
  handler: async (ctx, input) => {
    const profile = await chatGptProfile(ctx, input.userId);
    if (!profile || profile.generation !== input.generation)
      throw new ConvexError('ChatGPT connection attempt was canceled.');
    const existing = input.connectionId
      ? await ownedChatGptConnection(ctx, input.userId, input.connectionId)
      : await ctx.db
          .query('chatgptConnections')
          .withIndex('by_userId_and_clientId', (q) =>
            q.eq('userId', input.userId).eq('clientId', input.clientId)
          )
          .unique();
    if (existing && (existing.subject !== input.subject || existing.clientId !== input.clientId))
      throw new ConvexError(
        'ChatGPT returned a different account. Connect it as a new account instead.'
      );
    const fields = {
      userId: input.userId,
      subject: input.subject,
      clientId: input.clientId,
      ...(input.email ? { email: input.email } : {}),
      label: `${input.email ?? 'ChatGPT account'} · ${input.clientId.slice(-8)}`,
      tokens: input.tokens,
      needsReconnect: false,
      revision: (existing?.revision ?? 0) + 1
    };
    const id = existing?._id ?? (await ctx.db.insert('chatgptConnections', fields));
    if (existing)
      await ctx.db.patch('chatgptConnections', id, {
        ...fields,
        leaseId: undefined,
        leaseUntil: undefined
      });
    await ctx.db.patch('chatgptProfiles', profile._id, {
      activeConnectionId: id,
      generation: profile.generation + 1
    });
    return null;
  }
});
export const connection = internalQuery({
  args: { userId: v.string(), connectionId: v.optional(v.id('chatgptConnections')) },
  handler: async (ctx, { userId, connectionId }): Promise<Doc<'chatgptConnections'> | null> => {
    const id = connectionId ?? (await chatGptProfile(ctx, userId))?.activeConnectionId;
    return id ? await ownedChatGptConnection(ctx, userId, id) : null;
  }
});
/** Invalidate only the rejected credential revision, never a concurrent refresh. */
export const markReconnect = internalMutation({
  args: { userId: v.string(), connectionId: v.id('chatgptConnections'), revision: v.number() },
  returns: v.boolean(),
  handler: async (ctx, input) => {
    const record = await ownedChatGptConnection(ctx, input.userId, input.connectionId);
    if (
      !record.tokens ||
      record.revision !== input.revision ||
      (record.leaseUntil ?? 0) > Date.now()
    )
      return false;
    await ctx.db.patch('chatgptConnections', record._id, {
      tokens: undefined,
      needsReconnect: true,
      revision: record.revision + 1,
      leaseId: undefined,
      leaseUntil: undefined
    });
    return true;
  }
});

export const acquireRefresh = internalMutation({
  args: {
    userId: v.string(),
    connectionId: v.id('chatgptConnections'),
    revision: v.number(),
    leaseId: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, input) => {
    const record = await ownedChatGptConnection(ctx, input.userId, input.connectionId);
    if (
      !record.tokens ||
      record.needsReconnect ||
      record.revision !== input.revision ||
      (record.leaseUntil ?? 0) > Date.now()
    )
      return false;
    await ctx.db.patch('chatgptConnections', record._id, {
      leaseId: input.leaseId,
      leaseUntil: Date.now() + 60_000
    });
    return true;
  }
});
export const finishRefresh = internalMutation({
  args: {
    userId: v.string(),
    connectionId: v.id('chatgptConnections'),
    revision: v.number(),
    leaseId: v.string(),
    tokens: v.optional(chatGptTokensValidator),
    reconnect: v.boolean()
  },
  returns: v.boolean(),
  handler: async (ctx, input) => {
    const record = await ownedChatGptConnection(ctx, input.userId, input.connectionId);
    if (record.revision !== input.revision || record.leaseId !== input.leaseId) return false;
    await ctx.db.patch('chatgptConnections', record._id, {
      ...(input.tokens ? { tokens: input.tokens, revision: record.revision + 1 } : {}),
      ...(input.reconnect
        ? { tokens: undefined, needsReconnect: true, revision: record.revision + 1 }
        : {}),
      leaseId: undefined,
      leaseUntil: undefined
    });
    return true;
  }
});
export const disconnect = internalMutation({
  args: { userId: v.string(), connectionId: v.id('chatgptConnections') },
  handler: async (ctx, { userId, connectionId }) => {
    const [record, profile] = await Promise.all([
      ownedChatGptConnection(ctx, userId, connectionId),
      chatGptProfile(ctx, userId)
    ]);
    await ctx.db.patch('chatgptConnections', connectionId, {
      tokens: undefined,
      model: undefined,
      needsReconnect: false,
      revision: record.revision + 1,
      leaseId: undefined,
      leaseUntil: undefined
    });
    if (profile)
      await ctx.db.patch('chatgptProfiles', profile._id, { generation: profile.generation + 1 });
    return record;
  }
});

/** Personal ChatGPT credentials are removed when their Groam account is deleted. */
export const removeUserConnections = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await Promise.all(
      (['chatgptConnections', 'chatgptProfiles', 'chatgptTransactions'] as const).map(
        async (table) => {
          const records = await ctx.db
            .query(table)
            .withIndex('by_userId', (q) => q.eq('userId', userId))
            .collect();
          await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        }
      )
    );
    return null;
  }
});
