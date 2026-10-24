'use client';

import { CornerDownLeftIcon, EllipsisIcon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@groam/ui/components/tooltip';
import type { ComponentProps, ReactElement, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';
import { Menu, MenuPopup, MenuTrigger } from '#tsx/components/chat/primitives/menu';
import { Toolbar, ToolbarButton } from '#tsx/components/chat/primitives/toolbar';
import { useChatPopupDismissal } from './hooks/use-chat-popup-dismissal';

export type ChatMessageActionToolbarProps = {
  side: 'incoming' | 'outgoing';
  toolbarLabel: string;
  reactionPicker?: (toolbarRef: RefObject<HTMLDivElement | null>) => ReactNode;
  menuTriggerRef?: RefObject<HTMLButtonElement | null>;
  menuFinalFocus?: ComponentProps<typeof MenuPopup>['finalFocus'];
  /** Stable test hooks on the reply and more-actions buttons. */
  replyTestId?: string;
  moreTestId?: string;
} & (
  | { onReply: () => void; replyLabel: string; replyTooltip: string }
  | { onReply?: never; replyLabel?: never; replyTooltip?: never }
) &
  (
    | { menuChildren: ReactNode; moreLabel: string; moreTooltip: string }
    | { menuChildren?: never; moreLabel?: never; moreTooltip?: never }
  );

export function ChatMessageActionToolbar({
  side,
  toolbarLabel,
  reactionPicker,
  replyLabel,
  replyTooltip,
  onReply,
  moreLabel,
  moreTooltip,
  menuChildren,
  menuTriggerRef: suppliedMenuTriggerRef,
  menuFinalFocus,
  replyTestId,
  moreTestId
}: ChatMessageActionToolbarProps): ReactElement | null {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDismissedOutside, setMenuDismissedOutside] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const ownMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = suppliedMenuTriggerRef ?? ownMenuTriggerRef;

  useChatPopupDismissal(menuOpen, menuTriggerRef, () => setMenuOpen(false));

  if (!reactionPicker && !onReply && !menuChildren) return null;

  return (
    <Toolbar
      ref={toolbarRef}
      aria-label={toolbarLabel}
      data-slot="chat-message-action-toolbar"
      className="z-10 min-w-max flex-none items-center gap-0 self-center rounded-full bg-transparent p-1 opacity-0 pointer-coarse:opacity-100 transition-opacity group-hover/message:opacity-100 has-data-popup-open:opacity-100 has-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {reactionPicker?.(toolbarRef)}
      {onReply && (
        <Tooltip>
          <TooltipTrigger
            render={
              <ToolbarButton
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="pointer-coarse:size-8 rounded-full before:rounded-full"
                    aria-label={replyLabel}
                    data-testid={replyTestId}
                    onMouseDown={(event) => {
                      if (event.button === 0) event.preventDefault();
                    }}
                    onClick={onReply}
                  />
                }
              />
            }
          >
            <CornerDownLeftIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipPopup>{replyTooltip}</TooltipPopup>
        </Tooltip>
      )}
      {menuChildren && (
        <Menu
          open={menuOpen}
          onOpenChange={(open, details) => {
            setMenuDismissedOutside(
              details.reason === 'outside-press' || details.reason === 'focus-out'
            );
            setMenuOpen(open);
          }}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <MenuTrigger
                      ref={menuTriggerRef}
                      render={
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="pointer-coarse:size-8 rounded-full before:rounded-full"
                          aria-label={moreLabel}
                          data-message-actions=""
                          data-testid={moreTestId}
                        />
                      }
                    />
                  }
                />
              }
            >
              <EllipsisIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipPopup>{moreTooltip}</TooltipPopup>
          </Tooltip>
          <MenuPopup
            anchor={toolbarRef}
            align={side === 'outgoing' ? 'start' : 'end'}
            finalFocus={menuDismissedOutside ? false : menuFinalFocus}
          >
            {menuChildren}
          </MenuPopup>
        </Menu>
      )}
    </Toolbar>
  );
}
