'use client';

import { cn } from '@groam/ui/lib/utils';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

/** Localized labels for the three theme cards; pass app i18n strings, not hard-coded copy. */
export type ThemeSelectorProps = {
  labels: { light: string; dark: string; system: string };
};

/** Visual light/dark/system picker. Requires `next-themes` via `UiThemeProvider`. */
export function ThemeSelector({ labels }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset aria-label="Color theme" className="grid gap-3 p-2 sm:grid-cols-3">
      <ThemeCard
        active={theme === 'light'}
        icon={Sun}
        label={labels.light}
        onClick={() => setTheme('light')}
        variant="light"
      />
      <ThemeCard
        active={theme === 'dark'}
        icon={Moon}
        label={labels.dark}
        onClick={() => setTheme('dark')}
        variant="dark"
      />
      <ThemeCard
        active={theme === 'system'}
        icon={Monitor}
        label={labels.system}
        onClick={() => setTheme('system')}
        variant="system"
      />
    </fieldset>
  );
}

function ThemeCard({
  active,
  icon: Icon,
  label,
  onClick,
  variant
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant: 'light' | 'dark' | 'system';
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl border p-2 text-left transition-colors',
        active
          ? 'border-foreground ring-1 ring-foreground'
          : 'border-border hover:border-foreground/25'
      )}
      data-testid={`theme-${variant}`}
      onClick={onClick}
      type="button"
    >
      <ThemePreview variant={variant} />
      <span className="flex items-center justify-center gap-1.5 pb-1 text-sm font-medium text-foreground">
        <Icon className="size-4" />
        {label}
      </span>
    </button>
  );
}

function ThemePreview({ variant }: { variant: 'light' | 'dark' | 'system' }) {
  return (
    <div className="h-24 w-full overflow-hidden rounded-lg border border-border sm:h-28">
      {variant === 'system' ? (
        <div className="flex h-full w-full">
          <div className="w-1/2 overflow-hidden">
            <ThemeMock mode="light" />
          </div>
          <div className="w-1/2 overflow-hidden">
            <ThemeMock mode="dark" />
          </div>
        </div>
      ) : (
        <ThemeMock mode={variant} />
      )}
    </div>
  );
}

function ThemeMock({ mode }: { mode: 'light' | 'dark' }) {
  const light = mode === 'light';
  return (
    <div className={cn('flex h-full w-full gap-1 p-1', light ? 'bg-white' : 'bg-neutral-900')}>
      <div className={cn('w-1/4 rounded-[2px]', light ? 'bg-neutral-200' : 'bg-neutral-700')} />
      <div className="flex flex-1 flex-col justify-center gap-1">
        <div className={cn('h-1 rounded-full', light ? 'bg-neutral-200' : 'bg-neutral-700')} />
        <div
          className={cn('h-1 w-2/3 rounded-full', light ? 'bg-neutral-200' : 'bg-neutral-700')}
        />
      </div>
    </div>
  );
}
