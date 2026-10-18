import type { HTMLAttributes, ReactNode } from 'react';

/** Page scaffolds share one design. Style content inside the named slots. */
export type ScaffoldProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> & {
  as?: 'div' | 'main' | 'section' | 'article' | 'aside';
  children: ReactNode;
  className?: never;
  style?: never;
};

export type TwoColumnsProps = ScaffoldProps;
export type LeftColumnProps = ScaffoldProps;
export type RightColumnProps = ScaffoldProps;
export type DesktopRightColumnProps = ScaffoldProps;
