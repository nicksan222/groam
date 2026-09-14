import { List } from 'lucide-react';
import type React from 'react';
import type { ReactNode } from 'react';
import { cn } from '#src/lib/utils';
import { Button } from './button';

export interface EmptyScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ElementType;
  customIcon?: React.ReactElement;
  avatar?: React.ReactElement;
  headline: string | React.ReactElement;
  description?: string | React.ReactElement;
  buttonText?: string;
  buttonTestId?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode;
  border?: boolean;
  dashedBorder?: boolean;
  iconWrapperClassName?: string;
  iconClassName?: string;
  limitWidth?: boolean;
}

export function EmptyScreen({
  icon: Icon,
  customIcon,
  avatar,
  headline,
  description,
  buttonText,
  buttonTestId,
  buttonOnClick,
  buttonRaw,
  border = false,
  dashedBorder = true,
  className,
  iconClassName,
  iconWrapperClassName,
  limitWidth = true,
  ...props
}: EmptyScreenProps) {
  return (
    <div
      data-testid="empty-screen"
      className={cn(
        'flex min-h-80 flex-1 w-full select-none flex-col items-center justify-center gap-5 rounded-xl p-6 lg:p-10',
        border && (dashedBorder ? 'border border-dashed border-border' : 'border border-border'),
        className
      )}
      {...props}
    >
      <EmptyVisual
        avatar={avatar}
        customIcon={customIcon}
        icon={Icon}
        iconClassName={iconClassName}
        iconWrapperClassName={iconWrapperClassName}
      />

      <div className={cn('flex flex-col items-center gap-1.5', limitWidth && 'max-w-sm')}>
        <h2 className="text-center text-base font-semibold">{headline}</h2>
        {description && <p className="text-center text-sm text-muted-foreground">{description}</p>}
      </div>

      <EmptyAction
        buttonOnClick={buttonOnClick}
        buttonRaw={buttonRaw}
        buttonTestId={buttonTestId}
        buttonText={buttonText}
      />
    </div>
  );
}

function EmptyVisual({
  avatar,
  customIcon,
  icon: Icon,
  iconClassName,
  iconWrapperClassName
}: Pick<
  EmptyScreenProps,
  'avatar' | 'customIcon' | 'icon' | 'iconClassName' | 'iconWrapperClassName'
>) {
  const ResolvedIcon = Icon ?? (customIcon ? null : List);
  return (
    <>
      {avatar && <div>{avatar}</div>}
      {ResolvedIcon && (
        <div
          className={cn(
            'relative flex size-10 items-center justify-center rounded-md border border-border',
            iconWrapperClassName
          )}
        >
          <ResolvedIcon
            className={cn('size-4 text-muted-foreground', iconClassName)}
            strokeWidth={1.75}
          />
        </div>
      )}
      {customIcon}
    </>
  );
}

function EmptyAction({
  buttonOnClick,
  buttonRaw,
  buttonTestId,
  buttonText
}: Pick<EmptyScreenProps, 'buttonOnClick' | 'buttonRaw' | 'buttonTestId' | 'buttonText'>) {
  if (!(buttonOnClick && buttonText) && !buttonRaw) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {buttonOnClick && buttonText && (
        <Button data-testid={buttonTestId} onClick={buttonOnClick} size="sm">
          {buttonText}
        </Button>
      )}
      {buttonRaw}
    </div>
  );
}
