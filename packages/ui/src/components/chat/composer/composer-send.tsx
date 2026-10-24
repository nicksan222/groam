'use client';

import { ArrowUp, Loader2Icon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import type { ReactElement, ReactNode } from 'react';
import { ComposerSubmit } from '#tsx/components/chat/composer/composer';

export type ComposerSendProps = {
  className?: string;
  /** Replaces the default arrow. */
  icon?: ReactNode;
  /** Accessible name and tooltip. */
  label?: string;
  /** Swaps the icon for a spinner while the owner accepts the message. */
  pending?: boolean;
  size?: 'icon' | 'icon-sm';
  testId?: string;
};

/**
 * The coss send button: `ComposerSubmit` rendered through the shared Button with a tooltip, so
 * it follows the Composer's submission policy (empty drafts, `submitDisabled`, `disabled`).
 */
export function ComposerSend({
  className,
  icon,
  label = 'Send message',
  pending = false,
  size = 'icon',
  testId
}: ComposerSendProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ComposerSubmit
            aria-label={label}
            data-testid={testId}
            render={
              <Button
                aria-busy={pending || undefined}
                aria-label={label}
                className={cn('touch-manipulation rounded-full shadow-none', className)}
                data-pending={pending ? '' : undefined}
                size={size}
              />
            }
          />
        }
      >
        {pending ? (
          <Loader2Icon aria-hidden="true" className="animate-spin" />
        ) : (
          (icon ?? <ArrowUp aria-hidden="true" />)
        )}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}
