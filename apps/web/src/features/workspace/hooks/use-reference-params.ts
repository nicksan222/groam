import { api } from '@groam/backend/api';
import { useQueries } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useContext, useMemo, useRef } from 'react';
import { ReferenceCacheContext } from '@/features/workspace/hooks/reference-context';
import { referenceEntries, rememberReference } from '@/features/workspace/hooks/reference-params';
import type { ResolvedReference } from '@/types/references';

export function useReferenceParams(params: unknown) {
  // Session-scoped cache of resolved references, keyed by `${table}:${reference}` for both the
  // long id and the short id, so revisiting a known entity in either form never shows loading.
  const local = useRef(new Map<string, ResolvedReference>());
  const cache = useContext(ReferenceCacheContext) ?? local.current;
  // useQueries needs a stable request object, including for routes with no references.
  const referencesKey = JSON.stringify(referenceEntries(params));
  const { entries, queries } = useMemo(() => {
    const entries = JSON.parse(referencesKey) as ReturnType<typeof referenceEntries>;
    const queries = Object.fromEntries(
      entries.map(({ key, table, reference }) => [
        key,
        { query: api.routes.references.resolve.run, args: { table, reference } }
      ])
    );
    return { entries, queries };
  }, [referencesKey]);
  const results = useQueries(queries);
  const ids: Record<string, string> = {};
  const shortIds: Record<string, string> = {};
  let loading = false;
  let missing = false;
  for (const { key, table, reference } of entries) {
    const live = results[key] as
      | FunctionReturnType<typeof api.routes.references.resolve.run>
      | Error
      | undefined;
    if (live instanceof Error) throw live;
    if (live) rememberReference(cache, table, reference, live);
    const result = live === undefined ? cache.get(`${table}:${reference}`) : live;
    if (result === undefined) loading = true;
    else if (result === null) missing = true;
    else {
      ids[key] = result.id;
      shortIds[key] = result.shortId;
    }
  }
  return { ids, shortIds, loading, missing };
}
