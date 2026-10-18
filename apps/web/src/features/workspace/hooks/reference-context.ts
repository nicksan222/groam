import { createContext, useContext } from 'react';
import type { ReferenceCache } from '@/types/references';

export const ReferenceStatusContext = createContext({ loading: false, missing: false });

export const ReferenceContext = createContext<Record<string, string> | null>(null);

export function useResolvedParams<T extends object>(params: T): T {
  const resolved = useContext(ReferenceContext);
  return { ...params, ...resolved };
}

/** Provided by ReferenceProvider so every consumer shares one resolution cache. */
export const ReferenceCacheContext = createContext<ReferenceCache | null>(null);
