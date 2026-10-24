'use client';

import { AlertTriangle, Loader2 } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShellSlots } from '#src/components/shell/context';
import type { ContentProps } from '#src/components/shell/types';
import PageBody from './page-body';

/**
 * Shell Content component.
 *
 * Registers with the Shell slot context and portals its rendered output
 * into the Shell-rendered content slot, so it can be nested under any
 * wrapper component (fragments, function components) and still place
 * itself correctly relative to side/sidebar tab containers.
 */
const Content: React.FC<ContentProps> = ({
  children,
  className,
  isLoading,
  isEmpty,
  isError,
  errorMessage,
  emptyProps,
  errorProps
}) => {
  const slots = useShellSlots();
  const addConsumer = slots?.addConsumer;
  const removeConsumer = slots?.removeConsumer;

  useEffect(() => {
    if (!addConsumer || !removeConsumer) return;
    addConsumer('content');
    return () => removeConsumer('content');
  }, [addConsumer, removeConsumer]);

  const rendered = (
    <div
      data-slot="shell-content"
      className={cn(
        'h-full min-h-0 w-full max-w-full min-w-0 flex-1 flex flex-col overflow-y-auto overflow-x-hidden [&>*]:min-w-0',
        className
      )}
    >
      {isLoading ? (
        <PageBody>
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </PageBody>
      ) : isError ? (
        <PageBody>
          <EmptyScreen
            headline="Something went wrong"
            description={errorMessage || 'An error occurred while loading the content'}
            icon={AlertTriangle}
            iconClassName="text-destructive"
            {...errorProps}
          />
        </PageBody>
      ) : isEmpty ? (
        <PageBody>
          <EmptyScreen headline="No Content" {...emptyProps} />
        </PageBody>
      ) : (
        children
      )}
    </div>
  );

  if (slots) {
    const slotEl = slots.slots.content.el;
    return slotEl ? createPortal(rendered, slotEl) : null;
  }
  return rendered;
};

export default Content;
