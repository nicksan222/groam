'use client';

import { Button } from '@groam/ui/components/button';
import { ChevronLeft } from 'lucide-react';
import type React from 'react';

import type { BackProps } from '#src/components/shell/types';

/** Framework-agnostic shell back control for links, callbacks, and browser history. */
const Back: React.FC<BackProps> = ({ onClick, href, goBack = true }) => {
  if (href) {
    return (
      <Button
        asChild
        className="size-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        variant="ghost"
      >
        <a aria-label="Go back" href={href}>
          <ChevronLeft className="size-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button
      aria-label="Go back"
      className="size-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (onClick) onClick();
        else if (goBack) window.history.back();
      }}
      type="button"
      variant="ghost"
    >
      <ChevronLeft className="size-4" />
    </Button>
  );
};

export default Back;
