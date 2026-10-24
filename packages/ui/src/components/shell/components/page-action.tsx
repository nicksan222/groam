'use client';

import { Loader2, type Icon } from '@groam/icons';
import { Button, type ButtonProps } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import { SHELL_ACTION_PHONE } from '#src/lib/shell-layout';

export interface ActionProps extends Omit<ButtonProps, 'asChild' | 'children' | 'size'> {
  /** From `md`, a different icon (or `null` for none) than the phone's; omit to show `icon` everywhere. */
  desktopIcon?: Icon | null;
  /** Put the desktop icon after the label (a trailing arrow). */
  desktopIconEnd?: boolean;
  /** The phone icon, and the desktop icon unless `desktopIcon` says otherwise. */
  icon: Icon;
  /** Icon-only on desktop too (a ⋯ menu trigger, copy link). The label stays the accessible name. */
  iconOnly?: boolean;
  /** The accessible name, tooltip and, from `md`, the visible label. */
  label: string;
  /** Swaps the icon for a spinner while the action runs. */
  pending?: boolean;
  /** `primary`: the page's one main action (default). `secondary`: menus, copy link, extras. */
  tone?: 'primary' | 'secondary';
}

/**
 * A page-header action. Pass it as (part of) `Shell.Header`'s `actions`. One element in two forms:
 * from `md` an ordinary labelled `Button` in the title row; on phones a round icon-only button in
 * the bottom-right dock (`SHELL_DOCK`), 48px filled for `primary`, 40px outlined for `secondary`.
 * It takes everything a `Button` takes (`onClick`, `disabled`, `variant`, a `ref`; wrap it in
 * `DropdownMenuTrigger asChild` for a menu) and renders no markup twice, so test ids stay unique.
 */
const Action: React.FC<ActionProps> = ({
  className,
  desktopIcon,
  desktopIconEnd = false,
  icon: PhoneIcon,
  iconOnly = false,
  label,
  pending = false,
  title,
  tone = 'primary',
  type = 'button',
  variant,
  ...props
}) => {
  const split = desktopIcon !== undefined && !pending;
  const DesktopIcon = desktopIcon ?? null;
  const Lead = pending ? Loader2 : PhoneIcon;
  const leadClass = cn(
    'size-5 md:size-4',
    split && 'md:hidden',
    pending && 'animate-spin motion-reduce:animate-none'
  );
  const desktop =
    split && DesktopIcon ? <DesktopIcon aria-hidden className="size-4 max-md:hidden" /> : null;
  return (
    <Button
      {...props}
      className={cn(SHELL_ACTION_PHONE[tone], className)}
      size={iconOnly ? 'icon' : 'default'}
      title={title ?? label}
      type={type}
      variant={variant ?? (tone === 'primary' ? 'default' : 'outline')}
    >
      <Lead aria-hidden className={leadClass} />
      {desktopIconEnd ? null : desktop}
      <span className={iconOnly ? 'sr-only' : 'sr-only md:not-sr-only'}>{label}</span>
      {desktopIconEnd ? desktop : null}
    </Button>
  );
};

export default Action;
