'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ActionEntry, ShellState, StepsConfig } from '#src/components/shell/store';
import type { ActionProps } from '#src/components/shell/types';

export type ShellContextValue = ShellState & {
  addAction: (id: string, props: ActionProps) => void;
  clearSteps: () => void;
  removeAction: (id: string) => void;
  setSteps: (config: StepsConfig) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [steps, setStepsState] = useState<StepsConfig | null>(null);
  const insertionCounter = useRef(0);
  const insertionIndexes = useRef(new Map<string, number>());

  const addAction = useCallback((id: string, props: ActionProps) => {
    let insertionIndex = insertionIndexes.current.get(id);
    if (insertionIndex === undefined) {
      insertionIndex = insertionCounter.current;
      insertionCounter.current += 1;
      insertionIndexes.current.set(id, insertionIndex);
    }
    const entry = { id, insertionIndex, props };
    setActions((current) => {
      const exists = current.some((action) => action.id === id);
      return exists
        ? current.map((action) => (action.id === id ? entry : action))
        : [...current, entry];
    });
  }, []);
  const removeAction = useCallback((id: string) => {
    insertionIndexes.current.delete(id);
    setActions((current) => current.filter((action) => action.id !== id));
  }, []);
  const setSteps = useCallback((config: StepsConfig) => setStepsState(config), []);
  const clearSteps = useCallback(() => setStepsState(null), []);

  const value = useMemo(
    () => ({ actions, addAction, clearSteps, removeAction, setSteps, steps }),
    [actions, addAction, clearSteps, removeAction, setSteps, steps]
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellStore<T>(selector: (state: ShellContextValue) => T): T {
  const context = useContext(ShellContext);
  if (!context) throw new Error('Shell components must be rendered inside Shell');
  return selector(context);
}
