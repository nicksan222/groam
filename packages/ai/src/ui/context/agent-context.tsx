import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { AgentScreenContext } from './agent-screen-context';

export type { AgentScreenContext } from './agent-screen-context';

type AgentContextRegistry = {
  context: AgentScreenContext | null;
  register: (token: symbol, context: AgentScreenContext) => () => void;
};

const AgentContext = createContext<AgentContextRegistry | null>(null);

export function AgentContextProvider({ children }: { children: ReactNode }) {
  const registrations = useRef(new Map<symbol, AgentScreenContext>());
  const [context, setContext] = useState<AgentScreenContext | null>(null);

  const register = useCallback((token: symbol, nextContext: AgentScreenContext) => {
    registrations.current.set(token, nextContext);
    setContext(nextContext);
    return () => {
      registrations.current.delete(token);
      const remaining = Array.from(registrations.current.values());
      setContext(remaining[remaining.length - 1] ?? null);
    };
  }, []);

  const value = useMemo(() => ({ context, register }), [context, register]);
  return <AgentContext value={value}>{children}</AgentContext>;
}

export function useSetAgentContext(context: AgentScreenContext | null): void {
  const registry = useContext(AgentContext);
  if (!registry) throw new Error('useSetAgentContext must be used inside AgentContextProvider');
  const [token] = useState(() => Symbol('agent-screen-context'));
  const cleanup = useRef<(() => void) | null>(null);
  const previous = useRef<string | null>(null);
  const serialized = JSON.stringify(context);

  useEffect(() => {
    if (serialized === previous.current) return;
    cleanup.current?.();
    cleanup.current = context ? registry.register(token, context) : null;
    previous.current = serialized;
  });

  useEffect(
    () => () => {
      cleanup.current?.();
    },
    []
  );
}

export function useCurrentAgentContext(): AgentScreenContext | null {
  const registry = useContext(AgentContext);
  if (!registry) throw new Error('useCurrentAgentContext must be used inside AgentContextProvider');
  return registry.context;
}
