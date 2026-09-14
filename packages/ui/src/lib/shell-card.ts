import { cva, type VariantProps } from 'class-variance-authority';

export const shellEyebrowVariants = cva('font-medium uppercase', {
  defaultVariants: {
    tone: 'muted'
  },
  variants: {
    tone: {
      dense: 'text-[10px] tracking-[0.14em] text-muted-foreground',
      muted: 'text-[11px] tracking-[0.14em] text-muted-foreground',
      primary: 'text-xs font-semibold tracking-[0.14em] text-primary',
      section: 'text-xs font-semibold tracking-[0.14em] text-muted-foreground'
    }
  }
});

/** Default muted eyebrow — prefer `Shell.Eyebrow` / `shellEyebrowVariants` in new UI. */
export const SHELL_EYEBROW = shellEyebrowVariants({ tone: 'muted' });

export type ShellEyebrowTone = NonNullable<VariantProps<typeof shellEyebrowVariants>['tone']>;

export const shellCardHeaderVariants = cva('flex border-b border-border/35', {
  defaultVariants: {
    density: 'compact'
  },
  variants: {
    density: {
      compact: 'items-start justify-between gap-2 px-3 py-2.5',
      comfort: 'items-center gap-3 border-border/25 px-5 py-4'
    }
  }
});

export const shellCardBodyVariants = cva('', {
  defaultVariants: {
    padding: 'md'
  },
  variants: {
    padding: {
      lg: 'p-5',
      md: 'p-4 sm:p-5',
      none: '',
      sm: 'px-3 py-3'
    }
  }
});

export const shellCardFooterVariants = cva('flex border-t border-border/35', {
  defaultVariants: {
    density: 'compact'
  },
  variants: {
    density: {
      compact: 'flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
      comfort: 'items-center justify-end gap-2 border-border/25 px-5 py-4',
      inset: 'flex-wrap items-center justify-between gap-2 border-t-0 pt-2.5'
    }
  }
});

export type ShellCardHeaderDensity = NonNullable<
  VariantProps<typeof shellCardHeaderVariants>['density']
>;
export type ShellCardBodyPadding = NonNullable<
  VariantProps<typeof shellCardBodyVariants>['padding']
>;
export type ShellCardFooterDensity = NonNullable<
  VariantProps<typeof shellCardFooterVariants>['density']
>;

export const shellCardVariants = cva('min-w-0', {
  defaultVariants: {
    padding: 'none',
    reveal: false,
    stack: 'none',
    variant: 'well'
  },
  variants: {
    padding: {
      dashed: 'px-4 py-10',
      lg: 'p-6 sm:p-8',
      md: 'p-4 sm:p-5',
      none: '',
      sm: 'p-3 sm:p-4'
    },
    reveal: {
      false: '',
      true: 'dashboard-reveal'
    },
    stack: {
      lg: 'space-y-5',
      md: 'space-y-4',
      none: '',
      sm: 'space-y-3'
    },
    variant: {
      bare: '',
      callout: 'rounded-lg border border-border px-3.5 py-3 text-sm leading-relaxed',
      dashed:
        'rounded-xl border border-dashed border-border text-center transition-colors hover:border-foreground/20',
      destructive: 'rounded-xl border border-destructive/25',
      filled: 'dashboard-panel overflow-hidden',
      inset: 'overflow-hidden rounded-lg border border-border/50',
      lift: 'dashboard-lift-card overflow-hidden rounded-xl border border-border',
      muted: 'space-y-5 rounded-xl border border-dashed border-border text-center',
      panel: 'dashboard-panel',
      toolbar: 'flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2',
      well: 'rounded-xl border border-border'
    }
  }
});

export type ShellCardVariant = NonNullable<VariantProps<typeof shellCardVariants>['variant']>;
export type ShellCardPadding = NonNullable<VariantProps<typeof shellCardVariants>['padding']>;
export type ShellCardStack = NonNullable<VariantProps<typeof shellCardVariants>['stack']>;

const defaultReveal: Partial<Record<ShellCardVariant, boolean>> = {
  destructive: true,
  lift: true,
  muted: true,
  panel: true
};

const defaultPadding: Partial<Record<ShellCardVariant, ShellCardPadding>> = {
  callout: 'none',
  dashed: 'dashed',
  destructive: 'md',
  muted: 'lg',
  panel: 'md'
};

const defaultStack: Partial<Record<ShellCardVariant, ShellCardStack>> = {
  panel: 'md'
};

export function shellCardClassName({
  className,
  padding,
  reveal,
  stack,
  variant = 'well'
}: {
  className?: string;
  padding?: ShellCardPadding;
  reveal?: boolean;
  stack?: ShellCardStack;
  variant?: ShellCardVariant;
}) {
  return shellCardVariants({
    className,
    padding: padding ?? defaultPadding[variant] ?? 'none',
    reveal: reveal ?? defaultReveal[variant] ?? false,
    stack: stack ?? defaultStack[variant] ?? 'none',
    variant
  });
}
