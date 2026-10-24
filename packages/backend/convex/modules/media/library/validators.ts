import { type Infer, v } from 'convex/values';

export const listedMediaValidator = v.object({
  contentType: v.string(),
  createdAt: v.number(),
  id: v.id('media'),
  name: v.string(),
  purpose: v.optional(v.literal('groupLogo')),
  size: v.number(),
  url: v.union(v.string(), v.null())
});

export const saveMediaResultValidator = v.union(
  v.object({ mediaId: v.id('media'), ok: v.literal(true) }),
  v.object({ error: v.string(), ok: v.literal(false) })
);

export const groupLogoResultValidator = v.object({
  mediaId: v.id('media'),
  url: v.string()
});

export type ListedMedia = Infer<typeof listedMediaValidator>;
export type SaveMediaResult = Infer<typeof saveMediaResultValidator>;
export type GroupLogoResult = Infer<typeof groupLogoResultValidator>;
