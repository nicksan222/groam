import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const role = v.union(v.literal('admin'), v.literal('member'));

const invitationCode = v.object({
  code: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  id: v.id('organizationInvitationCodes'),
  role
});

export const OrganizationInvitationValidators = {
  invitationCode,
  role
};

export const organizationInvitationTables = {
  organizationInvitationCodes: defineTable({
    code: v.string(),
    createdBy: v.string(),
    expiresAt: v.number(),
    organizationId: v.string(),
    role
  })
    .index('by_code', ['code'])
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_expiresAt', ['organizationId', 'expiresAt'])
};
