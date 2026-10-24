import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { TripTargetValidators } from '#convex/modules/travel/targets/schema';

export const mediaTables = {
  attachmentReferences: defineTable({
    attachmentId: v.id('attachments'),
    position: v.number(),
    target: TripTargetValidators.attachable,
    tripId: v.id('trips')
  })
    .index('by_tripId_and_target_type_and_target_id_and_position', [
      'tripId',
      'target.type',
      'target.id',
      'position'
    ])
    .index('by_attachmentId', ['attachmentId']),
  attachments: defineTable({
    mediaId: v.id('media'),
    tripId: v.id('trips')
  })
    .index('by_tripId_and_mediaId', ['tripId', 'mediaId'])
    .index('by_mediaId', ['mediaId']),
  media: defineTable({
    contentType: v.string(),
    createdBy: v.string(),
    name: v.string(),
    organizationId: v.string(),
    purpose: v.optional(v.literal('groupLogo')),
    size: v.number(),
    storageId: v.id('_storage')
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_purpose', ['organizationId', 'purpose'])
    .index('by_storageId', ['storageId'])
};
