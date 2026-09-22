import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@groam/ui/components/tooltip';
import { useIsMobile } from '@groam/ui/hooks/use-mobile';
import { cn } from '@groam/ui/lib/utils';
import { Sparkles } from 'lucide-react';
import type { CSSProperties, Ref } from 'react';

const RAIL_WIDTH = '3rem';

/** Collapsed Halo/Cloudflare-style rail — icon in chrome, not a floating pill. */
export function AssistantSidechatRail({
  isResponding,
  onOpen,
  ref
}: {
  isResponding: boolean;
  onOpen: () => void;
  ref: Ref<HTMLButtonElement>;
}) {
  const isMobile = useIsMobile();
  const label = isResponding ? 'Open Groam AI, response in progress' : 'Open Groam AI';
  const trigger = (
    <Button
      aria-controls="ai-assistant-widget"
      aria-expanded="false"
      aria-label={label}
      className={cn('relative', isMobile ? 'size-11 rounded-full shadow-lg' : 'size-8')}
      onClick={onOpen}
      ref={ref}
      size="icon-sm"
      type="button"
      variant={isMobile ? 'default' : 'ghost'}
    >
      <Sparkles
        className={cn(
          'size-4',
          isResponding && 'animate-pulse',
          !isMobile && isResponding && 'text-primary'
        )}
        strokeWidth={1.75}
      />
      {!isMobile && isResponding ? (
        <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
      ) : null}
    </Button>
  );

  if (isMobile) {
    return (
      <div className="ai-assistant-widget-launcher fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40">
        {trigger}
      </div>
    );
  }

  return (
    <aside
      aria-label="Groam AI"
      className="ai-assistant-widget-rail relative z-20 flex h-full w-(--ai-sidechat-rail-width) shrink-0 flex-col items-center border-l border-border bg-background"
      style={{ '--ai-sidechat-rail-width': RAIL_WIDTH } as CSSProperties}
    >
      <div className="flex h-[49px] w-full items-center justify-center border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="left">
            Ask Groam
            <kbd className="ml-2 font-sans text-[10px] text-background/70">⌘.</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
