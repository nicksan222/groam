'use client';

import { XIcon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import { usePresence, useReducedMotion } from 'motion/react';
import { m as motion } from 'motion/react';
import type { MouseEvent, ReactElement, ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { ScrollArea } from '#tsx/components/chat/primitives/scroll-area';
import { ChatMessageBubble } from './chat-message-bubble';
import { ChatMotion } from './chat-motion';

export type ChatReplyTarget = {
  source: HTMLDivElement;
  width: number;
  firstInGroup: boolean;
};

export type ChatReplyPreviewProps = {
  target: ChatReplyTarget;
  side: 'incoming' | 'outgoing';
  avatar?: ReactNode;
  author: ReactNode;
  replyLabel: ReactNode;
  cancelLabel: string;
  children: ReactNode;
  dismissalRef: RefObject<'cancel' | 'send'>;
  onCancel: () => void;
};

const ENTER_EASE = [0.3, 0.84, 0.24, 1] as const;
const LEAVE_EASE = [0.22, 1, 0.36, 1] as const;

type ReplyMotion = {
  isPresent: boolean;
  origin: number | null;
  reduceMotion: boolean;
  returning: boolean;
};

const fade = (visible: boolean, reduceMotion: boolean, duration: number) => ({
  animate: { opacity: visible ? 1 : 0 },
  transition: { duration: reduceMotion ? 0 : duration }
});

/** Lifts the bubble from its source, then returns it on cancel or fades it out on send. */
function bubbleMotion({ isPresent, origin, reduceMotion, returning }: ReplyMotion) {
  const sourceOffset = `translateY(${origin ?? 0}px)`;
  const leave = {
    opacity: returning ? 1 : 0,
    transform: returning ? sourceOffset : 'translateY(6px)'
  };
  const glide = { duration: 0.35, ease: ENTER_EASE, type: 'tween' as const };
  const transitionFor = () => {
    if (reduceMotion) return { duration: 0 };
    return isPresent || returning ? glide : { duration: 0.3, ease: LEAVE_EASE };
  };
  return {
    animate: isPresent ? { opacity: 1, transform: 'translateY(0px)' } : leave,
    initial: reduceMotion ? (false as const) : { opacity: 1, transform: sourceOffset },
    transition: transitionFor()
  };
}

function preventPointerFocus(event: MouseEvent<HTMLElement>): void {
  if (event.button === 0) event.preventDefault();
}

function ReplyCancelButton({
  cancelLabel,
  className,
  onCancel
}: {
  cancelLabel: string;
  className: string;
  onCancel: () => void;
}): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={cancelLabel}
            className={className}
            onClick={onCancel}
            onMouseDown={preventPointerFocus}
            size="icon-xs"
            type="button"
            variant="outline"
          />
        }
      >
        <XIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipPopup>{cancelLabel}</TooltipPopup>
    </Tooltip>
  );
}

function ReplyHeader({
  author,
  isPresent,
  own,
  reduceMotion,
  replyLabel,
  showAuthor
}: {
  author: ReactNode;
  isPresent: boolean;
  own: boolean;
  reduceMotion: boolean;
  replyLabel: ReactNode;
  showAuthor: boolean;
}): ReactElement {
  return (
    <motion.div
      className={cn(
        'flex h-lh min-w-0 max-w-full items-center gap-2 px-1 font-medium text-muted-foreground text-xs',
        own ? 'justify-self-end' : 'col-start-2 row-start-1'
      )}
      initial={{ opacity: showAuthor ? 1 : 0 }}
      {...fade(isPresent || showAuthor, reduceMotion, 0.18)}
    >
      <span className="min-w-0 truncate" role="status">
        {isPresent ? replyLabel : author}
      </span>
    </motion.div>
  );
}

/** Lifts the message being replied to above the composer and dims the conversation behind it. */
export function ChatReplyPreview({
  target,
  side,
  avatar,
  author,
  replyLabel,
  cancelLabel,
  children,
  dismissalRef,
  onCancel
}: ChatReplyPreviewProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const [isPresent, safeToRemove] = usePresence();
  const own = side === 'outgoing';
  const firstInGroup = target.firstInGroup;

  // Remeasure the source on exit too: the viewport or keyboard may have moved it.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const bubble = bubbleRef.current;
    if (!anchor || !bubble) return;
    const destination = anchor.getBoundingClientRect();
    const source = target.source.getBoundingClientRect();
    setOrigin(source.top - destination.top - bubble.offsetTop);
  }, [isPresent, target]);
  const returning = dismissalRef.current === 'cancel' && target.source.isConnected;

  return (
    <ChatMotion>
      <motion.button
        aria-label={cancelLabel}
        className="absolute inset-0 z-40 cursor-default touch-none bg-popover/32 backdrop-blur-sm chat-top-scrim"
        initial={{ opacity: 0 }}
        onClick={onCancel}
        onMouseDown={preventPointerFocus}
        onWheel={(event) => event.preventDefault()}
        tabIndex={-1}
        type="button"
        {...fade(isPresent, reduceMotion, 0.22)}
      />
      <div className="pointer-events-none absolute inset-0 z-50 overflow-clip">
        <ScrollArea
          className="**:data-[slot=scroll-area-content]:flex **:data-[slot=scroll-area-content]:min-h-full **:data-[slot=scroll-area-content]:flex-col **:data-[slot=scroll-area-content]:py-4 [&_[data-slot=scroll-area-scrollbar]]:pointer-events-auto"
          overscrollContain
        >
          <div
            className="relative mx-4 mt-auto shrink-0"
            data-slot="chat-reply-focus"
            ref={anchorRef}
          >
            <motion.div
              aria-hidden="true"
              className="absolute -inset-x-4 -top-20 -bottom-4 chat-reply-backdrop"
              initial={{ opacity: 0 }}
              {...fade(isPresent, reduceMotion, 0.22)}
            />
            <motion.div
              className={cn(
                'relative grid items-start gap-y-1',
                own ? 'grid-cols-1' : 'grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2',
                origin === null && 'invisible'
              )}
              key={origin === null ? 'measuring' : 'positioned'}
              onAnimationComplete={() => {
                if (!isPresent) safeToRemove?.();
              }}
              {...bubbleMotion({ isPresent, origin, reduceMotion, returning })}
            >
              {own ? null : (
                <motion.div
                  className="col-start-1 row-start-2 w-7"
                  initial={{ opacity: firstInGroup ? 1 : 0 }}
                  {...fade(isPresent || firstInGroup, reduceMotion, 0.18)}
                >
                  {avatar}
                </motion.div>
              )}
              <ReplyHeader
                author={author}
                isPresent={isPresent}
                own={own}
                reduceMotion={reduceMotion}
                replyLabel={replyLabel}
                showAuthor={!own && firstInGroup}
              />
              <div
                className={cn(
                  'pointer-events-auto relative row-start-2 max-w-full rounded-2xl bg-popover',
                  own ? 'justify-self-end' : 'col-start-2',
                  firstInGroup && (own ? 'rounded-se-md' : 'rounded-ss-md')
                )}
                ref={bubbleRef}
                style={{ width: target.width }}
              >
                <ChatMessageBubble firstInGroup={firstInGroup} side={side}>
                  {children}
                </ChatMessageBubble>
                <motion.div
                  className={cn(
                    'absolute -top-2.5 z-10 flex rounded-full bg-popover',
                    own ? '-start-2.5' : '-end-2.5'
                  )}
                  initial={{ opacity: 0 }}
                  {...fade(isPresent, reduceMotion, 0.18)}
                >
                  <ReplyCancelButton
                    cancelLabel={cancelLabel}
                    className="size-6 rounded-full before:rounded-full"
                    onCancel={onCancel}
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </ScrollArea>
      </div>
    </ChatMotion>
  );
}
