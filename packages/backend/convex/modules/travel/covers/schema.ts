import { v } from 'convex/values';

const attribution = v.object({
  creator: v.optional(v.string()),
  creatorUrl: v.optional(v.string()),
  license: v.string(),
  licenseUrl: v.string(),
  sourceName: v.string(),
  sourceUrl: v.string(),
  title: v.string()
});

const status = v.union(v.literal('failed'), v.literal('pending'), v.literal('ready'));

const stockCover = v.object({
  attribution,
  source: v.literal('stock'),
  storageId: v.id('_storage')
});

export const TripCoverValidators = {
  attribution,
  cover: v.union(
    v.object({
      asset: v.optional(stockCover),
      generation: v.number(),
      status: v.literal('pending')
    }),
    v.object({
      generation: v.number(),
      status: v.literal('failed')
    }),
    v.object({
      asset: v.union(
        stockCover,
        v.object({
          source: v.literal('upload'),
          storageId: v.id('_storage')
        })
      ),
      generation: v.number(),
      status: v.literal('ready')
    })
  ),
  status
};
