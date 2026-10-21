import { useContext } from 'react';
import { ReferenceContext } from '@/features/workspace/hooks/reference-context';
import { useParams as useRouteParams } from '@/lib/navigation/router';

/** Route params with short references replaced by the ids they resolve to. */
export function useParams<T extends Record<string, string | undefined>>(): Partial<T> {
  const params = useRouteParams<T>();
  const resolved = useContext(ReferenceContext);
  return (resolved ? { ...params, ...resolved } : params) as Partial<T>;
}
