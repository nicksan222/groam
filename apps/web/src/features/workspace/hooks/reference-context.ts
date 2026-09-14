import { createContext, useContext } from 'react';

export const ReferenceStatusContext = createContext({ loading: false, missing: false });

export const ReferenceContext = createContext<Record<string, string> | null>(null);

export function useResolvedParams<T extends object>(params: T): T {
  const resolved = useContext(ReferenceContext);
  return { ...params, ...resolved };
}
