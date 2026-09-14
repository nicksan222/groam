import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { type PropsWithChildren, useEffect } from 'react';
import {
  ReferenceContext,
  ReferenceStatusContext
} from '@/features/workspace/hooks/reference-context';
import { referenceEntries } from '@/features/workspace/hooks/reference-params';
import { useReferenceParams } from '@/features/workspace/hooks/use-reference-params';

export function ReferenceProvider({ children }: PropsWithChildren) {
  const params = useParams({ strict: false });
  const { ids, shortIds, loading, missing } = useReferenceParams(params);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const replacements = new Map(
    referenceEntries(params).map(({ key, reference }) => [reference, shortIds[key] ?? reference])
  );
  const canonicalPath = pathname
    .split('/')
    .map((part) => replacements.get(part) ?? part)
    .join('/');
  useEffect(() => {
    if (!loading && !missing && canonicalPath !== pathname) {
      void navigate({ to: canonicalPath, search: true, hash: true, replace: true });
    }
  }, [canonicalPath, pathname, loading, missing, navigate]);
  return (
    <ReferenceContext value={ids}>
      <ReferenceStatusContext value={{ loading, missing }}>{children}</ReferenceStatusContext>
    </ReferenceContext>
  );
}
