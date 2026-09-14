import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { aiKeyProviderValidator } from './validators';

export const aiTables = {
  aiSettings: defineTable({
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
    model: v.optional(v.string()),
    organizationId: v.string(),
    provider: aiKeyProviderValidator
  }).index('by_organizationId', ['organizationId'])
};
