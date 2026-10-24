'use client';

import { Square } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import type { ReactElement } from 'react';

export type ComposerStopProps = {
  className?: string;
  /** Accessible name, and the visible text with `showLabel`. */
  label?: string;
  onStop: () => unknown;
  /** Shows the label beside the icon instead of in a tooltip. */
  showLabel?: boolean;
  size?: 'icon' | 'icon-sm';
  /** Disables the control while a stop request is in flight. */
  stopping?: boolean;
  testId?: string;
};

/**
 * Stops a running reply from the composer's action row. coss has no stop control, so this sits
 * beside (or in place of) `ComposerSend` and never submits the draft.
 */
export function ComposerStop({
  className,
  label = 'Stop',
  onStop,
  showLabel = false,
  size = 'icon',
  stopping = false,
  testId
}: ComposerStopProps): ReactElement {
  const icon = (
    <Square
      aria-hidden="true"
      className={cn('fill-current', showLabel && 'size-3.5', stopping && 'animate-pulse')}
    />
  );
  const shared = {
    'aria-busy': stopping || undefined,
    className: cn('touch-manipulation rounded-full shadow-none', className),
    'data-slot': 'composer-stop',
    'data-testid': testId,
    disabled: stopping,
    onClick: () => void onStop(),
    type: 'button' as const
  };
  if (showLabel) {
    return (
      <Button {...shared} size="sm" variant="outline">
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...shared} aria-label={label} size={size} />}>
        {icon}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}
