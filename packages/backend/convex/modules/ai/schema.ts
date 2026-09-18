import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { aiKeyProviderValidator } from './validators';

export const aiTables = {
  aiSettings: defineTable({
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
    model: v.optional(v.string()),
    organizationId: v.string(),
    provider: aiKeyProviderValidator,
    userId: v.optional(v.string())
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_userId', ['organizationId', 'userId'])
    .index('by_userId', ['userId'])
};
