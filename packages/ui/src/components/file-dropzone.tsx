import { IconTile } from '@groam/ui/components/icon-tile';
import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';

export type FileDropzoneProps = Omit<
  React.ComponentProps<'button'>,
  'children' | 'onClick' | 'type'
> & {
  description?: ReactNode;
  icon?: ReactNode;
  onChoose: () => void;
  title: ReactNode;
};

function FileDropzone({
  className,
  description,
  disabled,
  icon,
  onChoose,
  title,
  ...props
}: FileDropzoneProps) {
  return (
    <button
      className={cn(
        'group flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 text-center transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      data-slot="file-dropzone"
      disabled={disabled}
      onClick={onChoose}
      type="button"
      {...props}
    >
      {icon ? <IconTile className="size-12 rounded-full">{icon}</IconTile> : null}
      <span>
        <span className="block text-sm font-medium">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

export { FileDropzone };
