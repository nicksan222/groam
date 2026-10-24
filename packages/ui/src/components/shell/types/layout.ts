import type React from 'react';
import type { ReactNode } from 'react';
import type { EmptyScreenProps } from '#tsx/components/empty-screen';

export interface ShellProps {
  children: ReactNode;
  className?: string;
}

export type DataAttributes = Record<`data-${string}`, string | undefined>;

export interface HeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Trailing controls, right-aligned on the title row. */
  actions?: ReactNode;
  className?: string;
  /** A quiet leading control (who is going), set off from the actions by a divider. */
  lead?: ReactNode;
  /** A tab strip directly under the header (an idea's views); the gap to the body follows it. */
  tabs?: ReactNode;
  /** One muted facts line directly under the title. */
  meta?: ReactNode;
  /** A quiet line under the header, for example that the trip is archived. */
  notice?: ReactNode;
  /**
   * What the page belongs to; muted, truncates before the title. A link element for a section or
   * list (it collapses to a back arrow below `md`), or the trip's name for a trip page.
   */
  parent?: ReactNode;
  /** `section` (default): back arrow below `md`. `trip`: hidden below `lg`, the top bar names it. */
  parentKind?: 'section' | 'trip';
  /** A state chip after the title. */
  status?: ReactNode;
  title: ReactNode;
  /** Test ids and `data-*` hooks for the title element itself. */
  titleProps?: React.HTMLAttributes<HTMLHeadingElement> & DataAttributes;
}

export interface FooterProps {
  children: ReactNode;
  className?: string;
}

export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  hideOnMobile?: boolean;
}

export interface ContentProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyProps?: Omit<EmptyScreenProps, 'headline'>;
  errorProps?: Omit<EmptyScreenProps, 'headline' | 'description'>;
}
