import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** Shares the lightweight DOM animation features with the chat's animated parts. */
export function ChatMotion({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
