import { createContext, useContext } from 'react';

type ListContextValue = {
  /** The list pulls out of the page's side padding. */
  bleed: boolean;
  /** The list grows to the height of its pane. */
  fill: boolean;
};

const ListContext = createContext<ListContextValue>({ bleed: true, fill: false });

/** What `List` told its parts about its frame; defaults match `<List>` with no props. */
export function useListContext() {
  return useContext(ListContext);
}

export const ListProvider = ListContext.Provider;
