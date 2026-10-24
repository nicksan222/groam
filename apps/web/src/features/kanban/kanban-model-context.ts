import { createContext, useContext } from 'react';
import type { KanbanModel } from '@/types/kanban';

export const KanbanModelContext = createContext<KanbanModel<unknown, string> | null>(null);

/** The model of the kanban this lane or card sits in. */
export function useKanbanModel<Item, Lane extends string>() {
  const model = useContext(KanbanModelContext);
  if (!model) throw new Error('A kanban lane or card must sit inside KanbanDnd.');
  return model as unknown as KanbanModel<Item, Lane>;
}
