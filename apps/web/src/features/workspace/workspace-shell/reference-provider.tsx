import { type PropsWithChildren, useEffect, useState } from 'react';
import {
  ReferenceCacheContext,
  ReferenceContext,
  ReferenceStatusContext
} from '@/features/workspace/hooks/reference-context';
import { referenceEntries } from '@/features/workspace/hooks/reference-params';
import { useReferenceParams } from '@/features/workspace/hooks/use-reference-params';
import { useLocation, useParams, useVisit } from '@/lib/navigation/router';

export function ReferenceProvider({ children }: PropsWithChildren) {
  const params = useParams();
  const [cache] = useState(() => new Map());
  return (
    <ReferenceCacheContext value={cache}>
      <ReferenceResolution params={params}>{children}</ReferenceResolution>
    </ReferenceCacheContext>
  );
}

function ReferenceResolution({ children, params }: PropsWithChildren<{ params: unknown }>) {
  const { ids, shortIds, loading, missing } = useReferenceParams(params);
  const { hash, pathname, search } = useLocation();
  const visit = useVisit();
  const replacements = new Map(
    referenceEntries(params).map(({ key, reference }) => [reference, shortIds[key] ?? reference])
  );
  const canonicalPath = pathname
    .split('/')
    .map((part) => replacements.get(part) ?? part)
    .join('/');
  useEffect(() => {
    if (!loading && !missing && canonicalPath !== pathname) {
      // Rewriting the URL to its short form is not a page change, so it skips the transition.
      visit(`${canonicalPath}${search}${hash}`, {
        replace: true,
        viewTransition: false
      }).catch(() => undefined);
    }
  }, [canonicalPath, hash, pathname, loading, missing, search, visit]);
  return (
    <ReferenceContext value={ids}>
      <ReferenceStatusContext value={{ loading, missing }}>{children}</ReferenceStatusContext>
    </ReferenceContext>
  );
}
