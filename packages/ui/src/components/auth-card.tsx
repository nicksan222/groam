import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@groam/ui/components/card';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

const sizeClasses = {
  default: 'max-w-md',
  wide: 'max-w-xl'
} as const;

export type AuthCardProps = {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  size?: keyof typeof sizeClasses;
  title: ReactNode;
};

function AuthCard({
  children,
  description,
  footer,
  headerExtra,
  size = 'default',
  title
}: AuthCardProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-1 flex-col gap-6 [&_input]:h-11 [&_button]:min-h-11 md:mx-auto md:flex-none md:[&_input]:h-9 md:[&_button]:min-h-0',
        sizeClasses[size]
      )}
      data-slot="auth-card"
    >
      <Card className="flex-none rounded-none border-0 bg-background px-0 md:rounded-xl md:border [view-transition-name:auth-card]">
        <CardHeader className="flex flex-col items-start gap-2 px-0 pt-0 text-left md:items-center md:px-6 md:pt-6 md:text-center">
          {headerExtra}
          <CardTitle className="text-2xl leading-tight text-balance md:text-xl">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-balance">{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 md:px-6">{children}</CardContent>
      </Card>
      {footer ? (
        <div className="mt-auto px-0 pb-2 text-center text-xs leading-relaxed text-muted-foreground md:mt-0 md:self-center md:rounded-lg md:bg-foreground/85 md:px-4 md:py-2 md:text-background md:shadow-sm md:backdrop-blur-sm">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export { AuthCard };
