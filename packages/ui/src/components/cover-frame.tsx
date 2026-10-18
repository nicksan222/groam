import { cn } from '@groam/ui/lib/utils';
import { ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type CoverFrameProps = {
  alt: string;
  className?: string;
  fallback?: ReactNode;
  src: string | null;
};

function CoverFrame({ alt, className, fallback, src }: CoverFrameProps) {
  return (
    <div
      className={cn('w-full overflow-hidden border-b border-border', className)}
      data-slot="cover-frame"
    >
      {src ? (
        <img
          alt={alt}
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          src={src}
        />
      ) : (
        <div className="grid size-full place-items-center">
          {fallback ?? <ImageIcon className="size-8 text-muted-foreground/40" />}
        </div>
      )}
    </div>
  );
}

export { CoverFrame };
