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
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-sm font-semibold transition-[color,background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-sm)-1px)] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";
const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:shadow-none disabled:shadow-none',
  destructive:
    'border-destructive bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 active:shadow-none disabled:shadow-none dark:focus-visible:ring-destructive/40',
  outline:
    'border-input bg-background text-foreground shadow-xs hover:border-border hover:bg-muted active:bg-muted active:shadow-none disabled:shadow-none dark:bg-input/32 dark:hover:bg-input/64',
  secondary:
    'border-input bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary-hover active:bg-secondary-hover/80 active:shadow-none disabled:shadow-none',
  ghost:
    'border-transparent text-foreground shadow-none hover:bg-muted active:bg-muted/80 dark:hover:bg-accent/50',
  link: 'border-transparent text-foreground underline-offset-4 hover:underline'
};
const SIZES: Record<ButtonSize, string> = {
  default: 'h-8 px-3',
  xs: 'h-6 gap-1 px-2 text-xs [&_svg:not([class*="size-"])]:size-3.5',
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  lg: 'h-9 px-4',
  icon: 'size-8',
  'icon-xs': 'size-6 [&_svg:not([class*="size-"])]:size-3.5',
  'icon-sm': 'size-7',
  'icon-lg': 'size-9'
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
