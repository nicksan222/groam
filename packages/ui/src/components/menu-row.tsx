import { cn } from '@groam/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

const menuRowVariants = cva(
  'flex w-full items-center gap-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
  {
    defaultVariants: {
      density: 'panel'
    },
    variants: {
      density: {
        panel: 'px-3 py-2',
        popover: 'rounded-md px-2 py-2'
      }
    }
  }
);

export type MenuRowDensity = NonNullable<VariantProps<typeof menuRowVariants>['density']>;

export type MenuRowProps = React.ComponentProps<'button'> & {
  density?: MenuRowDensity;
};

/** Full-width selectable row for popovers, pickers, and assignee menus. */
function MenuRow({ className, density = 'panel', type = 'button', ...props }: MenuRowProps) {
  return (
    <button
      className={cn(menuRowVariants({ density }), className)}
      data-density={density}
      data-slot="menu-row"
      type={type}
      {...props}
    />
  );
}

export { MenuRow };
