import { Button } from '@groam/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { ActionProps } from '#src/components/shell/types';

function getButtonContent({
  isCompact,
  icon,
  text
}: {
  isCompact: boolean;
  icon: ActionProps['icon'];
  text: ActionProps['text'];
}) {
  if (isCompact) {
    return icon || <span className="text-xs">{text?.charAt(0) || 'A'}</span>;
  }
  if (icon && text) {
    return (
      <>
        {icon}
        <span className="max-sm:sr-only">{text}</span>
      </>
    );
  }
  return icon || text;
}

function wrapWithLink(
  button: React.ReactNode,
  href: string | undefined,
  key: number
): React.ReactNode {
  if (!href) return button;
  return (
    <a href={href} key={key}>
      {button}
    </a>
  );
}

function wrapWithDisabledTooltip(
  content: React.ReactNode,
  isDisabled: boolean | undefined,
  disabledTooltip: string | undefined,
  key: number
): React.ReactNode {
  if (!isDisabled || !disabledTooltip) return content;
  return (
    <Tooltip key={key}>
      <TooltipTrigger asChild>
        <span className="inline-flex">{content}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledTooltip}</TooltipContent>
    </Tooltip>
  );
}

export function renderHeaderAction(action: ActionProps, key: number): React.ReactNode {
  const {
    variant = 'default',
    icon,
    text,
    onClick,
    isDisabled,
    disabledTooltip,
    href,
    className,
    forceMobile,
    'data-testid': dataTestId
  } = action;
  const isCompact = !!forceMobile || (!!icon && !text);
  const isResponsiveCompact = !!icon && !!text && !forceMobile;
  const isPrimary = variant === 'default';
  const button = (
    <Button
      key={key}
      type="button"
      variant={isPrimary ? 'outline' : variant}
      size={isCompact ? 'icon' : 'sm'}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        isPrimary &&
          'border-primary/40 text-primary hover:border-primary hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
        className,
        isResponsiveCompact && 'max-sm:size-9 max-sm:px-0',
        'rounded-md'
      )}
      aria-label={text || 'Action'}
      title={text || 'Action'}
      data-testid={dataTestId}
    >
      {getButtonContent({ isCompact, icon, text })}
    </Button>
  );
  return wrapWithDisabledTooltip(wrapWithLink(button, href, key), isDisabled, disabledTooltip, key);
}
