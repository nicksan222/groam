import { Badge } from '@groam/ui/components/badge';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type IconBadgeProps = {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
};

function IconBadge({ children, className, icon: Icon }: IconBadgeProps) {
  return (
    <Badge className={className} data-slot="icon-badge" variant="outline">
      <Icon className="size-3" /> {children}
    </Badge>
  );
}

export { IconBadge };
