import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const chatGptTokensValidator = v.object({
  accessToken: v.string(),
  refreshToken: v.string(),
  idToken: v.string(),
  expiresAt: v.number(),
  scopes: v.string()
});
export const chatGptConnectionFields = {
  userId: v.string(),
  subject: v.string(),
  email: v.optional(v.string()),
  clientId: v.string(),
  label: v.string(),
  tokens: v.optional(chatGptTokensValidator),
  model: v.optional(v.string()),
  needsReconnect: v.boolean(),
  revision: v.number(),
  leaseId: v.optional(v.string()),
  leaseUntil: v.optional(v.number())
};
export const chatGptTransactionFields = {
  userId: v.string(),
  state: v.string(),
  nonce: v.string(),
  verifier: v.string(),
  redirectUri: v.string(),
  expiresAt: v.number(),
  generation: v.number(),
  connectionId: v.optional(v.id('chatgptConnections'))
};
export const chatGptTables = {
  chatgptConnections: defineTable(chatGptConnectionFields)
    .index('by_userId', ['userId'])
    .index('by_userId_and_clientId', ['userId', 'clientId']),
  chatgptProfiles: defineTable({
    userId: v.string(),
    activeConnectionId: v.optional(v.id('chatgptConnections')),
    planNoticeAcknowledged: v.boolean(),
    generation: v.number()
  }).index('by_userId', ['userId']),
  chatgptTransactions: defineTable(chatGptTransactionFields)
    .index('by_state', ['state'])
    .index('by_userId', ['userId']),
  chatgptHosts: defineTable({ key: v.string(), hostId: v.string() }).index('by_key', ['key'])
};
