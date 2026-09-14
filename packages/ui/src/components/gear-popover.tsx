import { Button } from '@groam/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type GearPopoverProps = {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  testId?: string;
};

function GearPopover({ children, disabled, label, testId }: GearPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={label}
          className="-mr-1.5 text-muted-foreground hover:text-foreground"
          data-slot="gear-popover"
          data-testid={testId}
          disabled={disabled}
          size="icon-xs"
          variant="ghost"
        >
          <Settings2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--radix-popover-content-available-height) w-72 overflow-x-hidden overflow-y-auto p-0"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export { GearPopover };
