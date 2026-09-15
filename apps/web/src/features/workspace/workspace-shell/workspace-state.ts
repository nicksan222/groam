import { createContext, use } from 'react';
import type { WorkspaceContextValue } from '@/types/workspace';

export type { ActiveOrganization, Session, WorkspaceContextValue } from '@/types/workspace';

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useOptionalWorkspace();
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}

/** Workspace session when mounted under WorkspaceProvider; otherwise null. */
export function useOptionalWorkspace() {
  return use(WorkspaceContext);
}

export const createSlug = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'workspace'}-${crypto.randomUUID().slice(0, 6)}`;
};
