export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

const BASE =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition-shadow disabled:pointer-events-none disabled:opacity-64 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";
const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-primary/90 active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none disabled:shadow-none',
  destructive:
    'border-destructive bg-destructive text-white shadow-xs shadow-destructive/24 not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none disabled:shadow-none',
  outline:
    'border-input bg-popover text-foreground shadow-xs/5 not-dark:bg-clip-padding not-disabled:before:shadow-[0_1px_--theme(--color-black/4%)] hover:bg-accent/50 dark:bg-input/32 dark:hover:bg-input/64 dark:before:shadow-[0_-1px_--theme(--color-white/6%)] active:shadow-none disabled:shadow-none',
  secondary:
    'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover/80',
  ghost: 'border-transparent text-foreground hover:bg-accent dark:hover:bg-accent/50',
  link: 'border-transparent text-foreground underline-offset-4 hover:underline'
};
const SIZES: Record<ButtonSize, string> = {
  default: 'h-9 px-4',
  xs: 'h-7 gap-1 rounded-md px-2.5 text-xs before:rounded-[calc(var(--radius-md)-1px)] [&_svg:not([class*="size-"])]:size-3.5',
  sm: 'h-8 gap-1.5 px-3',
  lg: 'h-10 px-6',
  icon: 'size-9',
  'icon-xs':
    'size-7 rounded-md before:rounded-[calc(var(--radius-md)-1px)] [&_svg:not([class*="size-"])]:size-3.5',
  'icon-sm': 'size-8',
  'icon-lg': 'size-10'
};

export type ButtonVariantProps = {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
};

export function buttonVariants({
  variant = 'default',
  size = 'default',
  className
}: ButtonVariantProps & { className?: string } = {}): string {
  return [BASE, VARIANTS[variant ?? 'default'], SIZES[size ?? 'default'], className]
    .filter(Boolean)
    .join(' ');
}
