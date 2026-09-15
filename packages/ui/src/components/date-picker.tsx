'use client';

import { Button } from '@groam/ui/components/button';
import { Calendar } from '@groam/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { dateFromString, displayDate, stringFromDate } from '@groam/ui/lib/calendar-date';
import { cn } from '@groam/ui/lib/utils';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

export type DatePickerProps = {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  testId?: string;
  /** YYYY-MM-DD calendar date, or empty when unset. */
  value?: string;
};

function DatePicker({
  className,
  clearable = true,
  disabled = false,
  id,
  label,
  onChange,
  placeholder = 'Choose a date',
  testId,
  value
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? dateFromString(value) : undefined;

  return (
    <div className={cn('min-w-0', className)} data-slot="date-picker">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-label={label}
            className="h-9 w-full justify-start px-3 text-left font-normal"
            data-testid={testId}
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {date ? (
              <span>{displayDate.format(date)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-x-auto p-0">
          {open ? (
            <>
              <Calendar
                defaultMonth={date}
                mode="single"
                onSelect={(next) => {
                  onChange(next ? stringFromDate(next) : null);
                  setOpen(false);
                }}
                selected={date}
              />
              {clearable && date ? (
                <div className="border-t border-border p-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Clear date
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DatePicker };
