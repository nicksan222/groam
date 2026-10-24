'use client';

import { ArrowDownIcon } from '@groam/icons';
import { Button, type ButtonProps } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type { ReactElement, ReactNode } from 'react';

export type ChatJumpToLatestButtonProps = Omit<ButtonProps, 'children' | 'size' | 'variant'> & {
  children: ReactNode;
};

export function ChatJumpToLatestButton({
  className,
  children,
  ...props
}: ChatJumpToLatestButtonProps): ReactElement {
  return (
    <div data-slot="chat-jump-to-latest" className="rounded-full bg-popover/90 backdrop-blur-xs">
      <Button
        variant="outline"
        size="xs"
        className={cn('pointer-events-auto gap-2 rounded-full before:rounded-full', className)}
        {...props}
      >
        <ArrowDownIcon aria-hidden="true" />
        {children}
      </Button>
    </div>
  );
}
