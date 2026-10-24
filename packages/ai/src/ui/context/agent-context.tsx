import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState
} from 'react';
import type { AgentScreenContext } from './agent-screen-context';

export type { AgentScreenContext } from './agent-screen-context';

/**
 * One mounted page view and what it tells Groam AI. `id` stays the same while the view stays
 * mounted, so a page that is still loading (`context: null`) is the same screen once it loads.
 */
export type AgentScreen = { context: AgentScreenContext | null; id: string };

type AgentScreenRegistry = {
  mount: (id: string) => () => void;
  update: (id: string, context: AgentScreenContext | null) => void;
};

const RegistryContext = createContext<AgentScreenRegistry | null>(null);
const ScreenContext = createContext<AgentScreen | null | undefined>(undefined);

/** Holds the current page's screen context; every page view registers one (see `useSetAgentContext`). */
export function AgentContextProvider({ children }: { children: ReactNode }) {
  // Mount order: the newest mounted view is the current screen.
  const [screens, setScreens] = useState<readonly AgentScreen[]>([]);

  const mount = useCallback((id: string) => {
    setScreens((current) => [...current, { context: null, id }]);
    return () => setScreens((current) => current.filter((screen) => screen.id !== id));
  }, []);
  const update = useCallback((id: string, context: AgentScreenContext | null) => {
    setScreens((current) => current.map((screen) => (screen.id === id ? { context, id } : screen)));
  }, []);

  const registry = useMemo(() => ({ mount, update }), [mount, update]);
  const screen = screens.at(-1) ?? null;
  return (
    <RegistryContext value={registry}>
      <ScreenContext value={screen}>{children}</ScreenContext>
    </RegistryContext>
  );
}

/**
 * Tells Groam AI what the current page shows. Every page view calls it exactly once (the
 * `groam/view-registers-agent-context` lint rule enforces it); pass `null` while the page has
 * nothing to describe yet. Only a change in the serialized context re-registers it.
 */
export function useSetAgentContext(context: AgentScreenContext | null): void {
  const registry = useContext(RegistryContext);
  if (!registry) throw new Error('useSetAgentContext must be used inside AgentContextProvider');
  const { mount, update } = registry;
  const id = useId();
  const serialized = JSON.stringify(context);

  useEffect(() => mount(id), [id, mount]);
  useEffect(() => {
    update(id, JSON.parse(serialized) as AgentScreenContext | null);
  }, [id, serialized, update]);
}

/** The current page view and its context; null before any page view has mounted. */
export function useCurrentAgentScreen(): AgentScreen | null {
  const screen = useContext(ScreenContext);
  if (screen === undefined) {
    throw new Error('Groam AI screen context must be read inside AgentContextProvider');
  }
  return screen;
}

export function useCurrentAgentContext(): AgentScreenContext | null {
  return useCurrentAgentScreen()?.context ?? null;
}
