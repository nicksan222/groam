'use client';

import { HeartIcon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@groam/ui/components/tooltip';
import type { ComponentProps, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { Popover, PopoverPopup, PopoverTrigger } from '#tsx/components/chat/primitives/popover';
import { ToolbarButton } from '#tsx/components/chat/primitives/toolbar';
import { useChatPopupDismissal } from './hooks/use-chat-popup-dismissal';

export type ChatReactionPickerProps = {
  inToolbar?: boolean;
  options: readonly { emoji: string; label: string }[];
  selectedEmojis: readonly string[];
  triggerLabel: string;
  triggerTooltip: string;
  popupLabel: string;
  popupAlign?: ComponentProps<typeof PopoverPopup>['align'];
  popupAnchor?: ComponentProps<typeof PopoverPopup>['anchor'];
  onSelect: (emoji: string) => void;
  /** Stable test hook on the trigger button. */
  triggerTestId?: string;
};

export function ChatReactionPicker({
  inToolbar = false,
  options,
  selectedEmojis,
  triggerLabel,
  triggerTooltip,
  popupLabel,
  popupAlign,
  popupAnchor,
  onSelect,
  triggerTestId
}: ChatReactionPickerProps): ReactElement {
  const selected = new Set(selectedEmojis);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useChatPopupDismissal(open, triggerRef, () => setOpen(false));

  const trigger = (
    <PopoverTrigger
      ref={triggerRef}
      render={
        <Button
          size="icon-xs"
          variant="ghost"
          className="pointer-coarse:size-8 rounded-full before:rounded-full"
          aria-label={triggerLabel}
          data-testid={triggerTestId}
          onMouseDown={(event) => {
            if (event.button === 0) event.preventDefault();
          }}
        />
      }
    />
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={inToolbar ? <ToolbarButton render={trigger} /> : trigger}>
          <HeartIcon aria-hidden="true" className="size-3.5" />
        </TooltipTrigger>
        <TooltipPopup>{triggerTooltip}</TooltipPopup>
      </Tooltip>
      <PopoverPopup
        anchor={popupAnchor}
        side="top"
        align={popupAlign}
        aria-label={popupLabel}
        initialFocus={(interaction) => interaction === 'keyboard'}
        finalFocus={(interaction) => interaction === 'keyboard'}
        className="transform-gpu rounded-full before:rounded-full **:data-[slot=popover-viewport]:p-1"
      >
        <div className="flex">
          {options.map(({ emoji, label }) => (
            <Button
              key={emoji}
              aria-label={label}
              aria-pressed={selected.has(emoji)}
              variant="ghost"
              size="icon-lg"
              className="rounded-full before:rounded-full"
              onMouseDown={(event) => {
                if (event.button === 0) event.preventDefault();
              }}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {emoji}
              </span>
            </Button>
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
