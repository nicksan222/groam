'use client';

import { ArrowLeft } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import React from 'react';
import type { HeaderProps } from '#src/components/shell/types';
import {
  SHELL_DOCK,
  SHELL_HEADER_BODY_GAP,
  SHELL_HEADER_FACT,
  SHELL_HEADER_META,
  SHELL_HEADER_META_CLIP,
  SHELL_HEADER_META_PULL,
  SHELL_HEADER_META_ROW,
  SHELL_HEADER_PADDING,
  SHELL_HEADER_ROW,
  SHELL_HEADER_ROW_STYLE
} from '#src/lib/shell-layout';
import Title from '#tsx/components/shell/components/title';

/** The parent crumb and its slash; a trip's name truncates first, a section label never shrinks. */
const HeaderParent = ({ parent, tripParent }: { parent: React.ReactNode; tripParent: boolean }) => {
  if (!parent) return null;
  const show = tripParent ? 'max-lg:hidden' : 'max-md:hidden';
  return (
    <>
      <span
        className={cn(
          tripParent ? 'min-w-0 shrink-100 truncate' : 'shrink-0 whitespace-nowrap',
          'text-xl font-medium leading-tight tracking-tight text-muted-foreground [&_a]:underline-offset-4 [&_a]:hover:text-foreground [&_a]:hover:underline',
          show
        )}
        data-slot="shell-header-parent"
      >
        {parent}
      </span>
      <span aria-hidden className={cn('text-xl font-light leading-tight text-input', show)}>
        /
      </span>
    </>
  );
};

/**
 * The right-hand cluster: the lead control, a divider, then the actions. Only the actions survive
 * on phones, where they float as the action dock (`SHELL_DOCK`); with none, nothing renders.
 */
const HeaderActions = ({ actions, lead }: { actions: React.ReactNode; lead: React.ReactNode }) => {
  if (!actions && !lead) return null;
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 max-md:contents">
      {lead ? <div className="hidden md:contents">{lead}</div> : null}
      {lead && actions ? (
        <span
          aria-hidden
          className="mx-1 h-5 w-px shrink-0 bg-border max-md:hidden"
          data-slot="shell-header-divider"
        />
      ) : null}
      {actions ? (
        <div className={SHELL_DOCK} data-slot="shell-header-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
};

/**
 * The one page header, used by every page. No rule and no band: the header shares the page
 * background. The title row holds an optional `parent` (muted, same size as the title; a trip's name truncates first, a section label never shrinks), a light slash, the `title`, an optional `status` chip after it, and the `actions` on the
 * right. An optional `meta` line hangs directly under the title. From `md` the title row's centre
 * lines up with the centre of the sidebar's trip switcher (`SHELL_HEADER_ROW`). `tabs` hang under the header with their own underline; the header then owns the gap below them. On phones the title may take two lines and the actions wrap below it rather than overflow.
 */
const Header: React.FC<HeaderProps> = ({
  actions,
  className,
  lead,
  meta,
  notice,
  parent,
  parentKind = 'section',
  status,
  tabs,
  title,
  titleProps,
  ...rest
}) => {
  // A trip's name is the parent on trip pages and hides until `lg`; any other parent is a section
  // or list, which collapses to a back arrow below `md`.
  const tripParent = parentKind === 'trip';
  const back =
    !tripParent && React.isValidElement<{ children?: React.ReactNode }>(parent)
      ? React.cloneElement(parent, {
          'aria-label': 'Back',
          children: <ArrowLeft aria-hidden className="size-5" />,
          className: 'shrink-0 text-muted-foreground hover:text-foreground md:hidden',
          'data-slot': 'shell-header-back'
        } as Record<string, unknown>)
      : null;

  return (
    <div
      data-slot="shell-header"
      {...rest}
      style={{ ...SHELL_HEADER_ROW_STYLE, ...rest.style }}
      className={cn(
        'flex w-full max-w-full shrink-0 flex-col',
        tabs && SHELL_HEADER_BODY_GAP,
        className
      )}
    >
      <div className={cn('flex min-w-0 flex-col', SHELL_HEADER_PADDING, !meta && 'md:pb-1')}>
        <div className={cn('flex min-w-0 items-center gap-3', SHELL_HEADER_ROW)}>
          <div className="flex min-w-0 flex-1 items-center gap-2 max-md:flex-wrap">
            {back}
            <HeaderParent parent={parent} tripParent={tripParent} />
            <Title
              {...titleProps}
              className={cn(
                'min-w-0 truncate max-md:line-clamp-2 max-md:flex-1 max-md:whitespace-normal',
                titleProps?.className
              )}
              title={typeof title === 'string' ? title : undefined}
            >
              {title}
            </Title>
            {status ? (
              <span
                className={cn(
                  'flex shrink-0 items-center gap-2 max-md:order-last max-md:basis-full',
                  back && 'max-md:pl-6'
                )}
                data-slot="shell-header-status"
              >
                {status}
              </span>
            ) : null}
          </div>
          <HeaderActions actions={actions} lead={lead} />
        </div>
        {meta ? (
          <div
            className={cn('mt-1', SHELL_HEADER_META, SHELL_HEADER_META_PULL)}
            data-slot="shell-header-meta"
          >
            <div className={SHELL_HEADER_META_CLIP}>
              <div className={SHELL_HEADER_META_ROW}>
                {typeof meta === 'string' ? (
                  <span className={SHELL_HEADER_FACT}>{meta}</span>
                ) : (
                  meta
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {tabs}
      {notice}
    </div>
  );
};

export default Header;
