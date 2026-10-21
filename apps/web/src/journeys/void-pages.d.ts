declare module 'virtual:groam/void-pages' {
  import type { ComponentType } from 'react';

  // oxlint-disable-next-line typescript/no-explicit-any -- page props come from each page module
  export const components: Record<string, () => Promise<{ default: ComponentType<any> }>>;
  export const layoutTree: Record<string, string[]>;
  export const pagePatterns: { id: string; pattern: string }[];
}
