import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Whether the viewer asked the system for less motion; read at call time, never cached. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `scrollIntoView` behavior that honors the viewer's reduced-motion preference. */
export function motionSafeScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'instant' : 'smooth';
}
