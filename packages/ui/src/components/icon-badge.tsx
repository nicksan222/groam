import type { Icon } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import type { ReactNode } from 'react';

export type IconBadgeProps = {
  children: ReactNode;
  className?: string;
  icon: Icon;
};

function IconBadge({ children, className, icon: Icon }: IconBadgeProps) {
  return (
    <Badge className={className} data-slot="icon-badge" variant="outline">
      <Icon className="size-3" /> {children}
    </Badge>
  );
}

export { IconBadge };
