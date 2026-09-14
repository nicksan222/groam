import { api } from '@groam/backend/api';
import { useQueries } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useMemo } from 'react';
import { referenceEntries } from '@/features/workspace/hooks/reference-params';

export function useReferenceParams(params: unknown) {
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
  for (const { key } of entries) {
    const result = results[key] as
      | FunctionReturnType<typeof api.routes.references.resolve.run>
      | Error
      | undefined;
    if (result instanceof Error) throw result;
    if (result === undefined) loading = true;
    else if (result === null) missing = true;
    else {
      ids[key] = result.id;
      shortIds[key] = result.shortId;
    }
  }
  return { ids, shortIds, loading, missing };
}
