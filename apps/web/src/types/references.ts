/** What the reference resolver returns: the Convex id and the short id used in URLs. */
export type ResolvedReference = { id: string; shortId: string };

/** Session-scoped resolutions keyed by `${table}:${reference}`, for both id forms. */
export type ReferenceCache = Map<string, ResolvedReference>;
