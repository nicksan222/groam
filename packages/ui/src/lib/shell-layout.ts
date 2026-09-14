/**
 * Shared horizontal inset for workspace pages (home, lists, settings, group, issues).
 */
export const SHELL_PAGE_INSET = 'px-4 sm:px-6 lg:px-8';

/** Sticky header band on list/home shells (`Shell.Header`). */
export const SHELL_HEADER_PADDING = `${SHELL_PAGE_INSET} py-3`;

/** Default padded `Shell.Content` (home, trips, ideas, issues, inbox, agents). */
export const SHELL_CONTENT_PADDING = `${SHELL_PAGE_INSET} pb-4 pt-4`;

/** Vertical gap between multiple direct children inside padded `Shell.Content`. */
export const SHELL_CONTENT_GAP = 'gap-4';

/** Page title typography (`Shell.Title`, banner headings). */
export const SHELL_TITLE_TEXT = 'text-xl font-semibold text-foreground';

/** Page title in sticky list headers (`Shell.Title`). */
export const SHELL_TITLE = `m-0 p-0 ${SHELL_TITLE_TEXT}`;

/** Page description under a list header title (`Shell.Description`). */
export const SHELL_DESCRIPTION = 'text-xs text-muted-foreground';

/** Banner page title (`Shell.BannerHeading`, hero rows). */
export const SHELL_BANNER_TITLE = `truncate tracking-tight ${SHELL_TITLE_TEXT}`;

/** Banner page description (`Shell.BannerHeading`). */
export const SHELL_BANNER_DESCRIPTION = `truncate ${SHELL_DESCRIPTION}`;

/** In-page section heading (`Shell.SectionHeader`, card titles). */
export const SHELL_SECTION_TITLE = `font-semibold tracking-tight ${SHELL_TITLE_TEXT}`;

/** Compact title inside `Shell.NoticeBanner`. */
export const SHELL_NOTICE_TITLE = 'text-sm font-medium tracking-tight text-foreground';

/** Body copy inside `Shell.NoticeBanner`. */
export const SHELL_NOTICE_DESCRIPTION = 'mt-0.5 text-xs leading-5 text-muted-foreground';

/**
 * Full-bleed sticky banner band at the top of tabbed entity pages.
 * Uses page background; tab underline spans full width while inner content is inset.
 */
export const SHELL_BANNER_BAND = 'sticky top-0 z-10 w-full min-w-0 bg-background';

/** Breadcrumb rhythm inside `SHELL_BANNER_BAND`. */
export const SHELL_BANNER_CRUMB = 'pt-3 pb-2 sm:pt-4 sm:pb-2.5';

/** Title + actions row inside settings/group-style banner headers. */
export const SHELL_BANNER_HEADING =
  'flex min-w-0 items-center justify-between gap-3 py-2.5 sm:py-3';

/** Hero row below breadcrumbs on entity detail pages (cover + title + actions). */
export const SHELL_BANNER_HERO =
  'flex min-w-0 flex-wrap items-stretch gap-3 pb-4 sm:flex-nowrap sm:gap-4 sm:pb-5';

/**
 * Full-bleed notice band under entity tabs (shared plan / idea workspace).
 * Soft muted wash + light shadow — present, but not a hard chrome slab.
 */
export const SHELL_NOTICE_BANNER = `relative z-[1] flex w-full min-w-0 items-center justify-between gap-3 bg-muted/40 py-2.5 shadow-sm ${SHELL_PAGE_INSET}`;

/** Standard scrollable section block beneath a page body header. */
export const SHELL_SECTION_BASE = 'dashboard-reveal min-w-0 max-w-full';

export type ShellStackDensity = 'lg' | 'loose' | 'md' | 'none' | 'page' | 'sm';

/** @deprecated Prefer `ShellStackDensity`. */
export type ShellSectionStack = ShellStackDensity;

const stackDensityTokens: Record<ShellStackDensity, string> = {
  lg: 'space-y-5',
  loose: 'space-y-8 sm:space-y-10',
  md: 'space-y-4',
  none: '',
  page: 'space-y-6 sm:space-y-8',
  sm: 'space-y-3'
};

/** Vertical rhythm for `Shell.Stack` / `Shell.Section` / split panes. */
export function shellStackClassName({
  className,
  stack = 'md'
}: {
  className?: string;
  stack?: ShellStackDensity;
} = {}) {
  return ['min-w-0 max-w-full', stackDensityTokens[stack], className].filter(Boolean).join(' ');
}

/** Class names for `Shell.Section` — reveal wrapper with optional vertical rhythm. */
export function shellSectionClassName({
  className,
  stack = 'md'
}: {
  className?: string;
  stack?: ShellStackDensity;
} = {}) {
  return [SHELL_SECTION_BASE, stackDensityTokens[stack], className].filter(Boolean).join(' ');
}

/** Bordered underline tab strip under entity banners (trips, ideas, settings, group). */
export const SHELL_UNDERLINE_NAV = 'w-full min-w-0 border-b border-border bg-background';

export type ShellSplitAsideWidth = 'equal' | 'lg' | 'md' | 'sm' | 'xs';
export type ShellSplitBreakpoint = 'lg' | 'md' | 'xl';
export type ShellSplitGap = 'lg' | 'md';
export type ShellSplitSticky = 'far' | 'near' | false;

const splitGapTokens: Record<ShellSplitGap, string> = {
  lg: 'gap-8',
  md: 'gap-6 xl:gap-8'
};

/**
 * Complete static class names so Tailwind v4 can emit the utilities.
 * Do not interpolate breakpoint or arbitrary-value fragments.
 */
const splitGridCols: Record<ShellSplitBreakpoint, Record<ShellSplitAsideWidth, string>> = {
  lg: {
    equal: 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
    lg: 'lg:grid-cols-[minmax(0,1fr)_24rem]',
    md: 'lg:grid-cols-[minmax(0,1fr)_22rem]',
    sm: 'lg:grid-cols-[minmax(0,1fr)_20rem]',
    xs: 'lg:grid-cols-[minmax(0,1fr)_18rem]'
  },
  md: {
    equal: 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
    lg: 'md:grid-cols-[minmax(0,1fr)_24rem]',
    md: 'md:grid-cols-[minmax(0,1fr)_22rem]',
    sm: 'md:grid-cols-[minmax(0,1fr)_20rem]',
    xs: 'md:grid-cols-[minmax(0,1fr)_18rem]'
  },
  xl: {
    equal: 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
    lg: 'xl:grid-cols-[minmax(0,1fr)_24rem]',
    md: 'xl:grid-cols-[minmax(0,1fr)_22rem]',
    sm: 'xl:grid-cols-[minmax(0,1fr)_20rem]',
    xs: 'xl:grid-cols-[minmax(0,1fr)_18rem]'
  }
};

const splitStickyClass: Record<ShellSplitBreakpoint, string> = {
  lg: 'lg:sticky',
  md: 'md:sticky',
  xl: 'xl:sticky'
};

const splitStickyTop: Record<ShellSplitBreakpoint, Record<'far' | 'near', string>> = {
  lg: { far: 'lg:top-24', near: 'lg:top-6' },
  md: { far: 'md:top-24', near: 'md:top-6' },
  xl: { far: 'xl:top-24', near: 'xl:top-6' }
};

const splitOrderNone: Record<ShellSplitBreakpoint, string> = {
  lg: 'lg:order-none',
  md: 'md:order-none',
  xl: 'xl:order-none'
};

const splitMobileDividerReset: Record<ShellSplitBreakpoint, string> = {
  lg: 'lg:border-t-0 lg:pt-0',
  md: 'md:border-t-0 md:pt-0',
  xl: 'xl:border-t-0 xl:pt-0'
};

/** Two-column page split (main + aside). */
export function shellSplitClassName({
  asideWidth = 'md',
  breakpoint = 'xl',
  className,
  gap = 'lg'
}: {
  asideWidth?: ShellSplitAsideWidth;
  breakpoint?: ShellSplitBreakpoint;
  className?: string;
  gap?: ShellSplitGap;
} = {}) {
  return [
    'grid min-w-0 max-w-full items-start',
    splitGapTokens[gap],
    splitGridCols[breakpoint][asideWidth],
    className
  ]
    .filter(Boolean)
    .join(' ');
}

export function shellSplitAsideClassName({
  breakpoint = 'xl',
  className,
  mobileDivider = false,
  order,
  stack,
  sticky = false
}: {
  breakpoint?: ShellSplitBreakpoint;
  className?: string;
  mobileDivider?: boolean;
  order?: 'first' | 'none';
  stack?: ShellStackDensity;
  sticky?: ShellSplitSticky;
} = {}) {
  return [
    'min-w-0 max-w-full',
    sticky ? `${splitStickyClass[breakpoint]} ${splitStickyTop[breakpoint][sticky]}` : undefined,
    order === 'first' ? `order-first ${splitOrderNone[breakpoint]}` : undefined,
    mobileDivider
      ? `border-t border-border pt-4 ${splitMobileDividerReset[breakpoint]}`
      : undefined,
    stack ? stackDensityTokens[stack] : undefined,
    className
  ]
    .filter(Boolean)
    .join(' ');
}

/** Property facts grid inside a surface well. */
export const SHELL_PROPERTY_GRID =
  'min-w-0 max-w-full divide-y divide-border/35 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:divide-y-0 lg:items-start';

export const SHELL_PROPERTY_ROW =
  'flex min-w-0 items-baseline justify-between gap-x-4 gap-y-1 px-3.5 py-2.5 lg:block lg:px-4 lg:py-3';

/**
 * Contained outline well for hints, notices, and property blocks.
 * Border only — hierarchy comes from the stronger outer stroke.
 */
export const SHELL_SURFACE_WELL = 'rounded-xl border border-border';

export type ShellPageBodyVariant = 'compact' | 'detail' | 'list' | 'overview' | 'section';

const pageBodyTokens: Record<
  ShellPageBodyVariant,
  { bottom: string; gap: string; inset: 'inner' | 'outer'; top: string }
> = {
  compact: {
    bottom: 'pb-8',
    gap: 'space-y-5 sm:space-y-6',
    inset: 'outer',
    top: 'pt-4'
  },
  detail: {
    bottom: 'pb-8',
    gap: 'space-y-5 sm:space-y-6',
    inset: 'outer',
    top: 'pt-4 sm:pt-6'
  },
  list: {
    bottom: 'pb-4',
    gap: 'space-y-6 sm:space-y-8',
    inset: 'outer',
    top: 'pt-4'
  },
  overview: {
    bottom: 'pb-16 sm:pb-20',
    gap: 'space-y-8 sm:space-y-10',
    inset: 'outer',
    top: 'pt-5 sm:pt-6'
  },
  section: {
    bottom: 'pb-12',
    gap: 'space-y-6 sm:space-y-8',
    inset: 'outer',
    top: 'pt-6 sm:pt-8'
  }
};

/** Class names for `Shell.PageBody` variants — useful when composing custom wrappers. */
export function shellPageBodyClassName(variant: ShellPageBodyVariant, className?: string): string {
  const tokens = pageBodyTokens[variant];
  const outer = [
    'mx-auto w-full max-w-full min-w-0',
    tokens.gap,
    tokens.top,
    tokens.bottom,
    tokens.inset === 'outer' ? SHELL_PAGE_INSET : undefined,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return outer;
}

export function shellPageBodyInnerClassName(variant: ShellPageBodyVariant): string | undefined {
  return pageBodyTokens[variant].inset === 'inner' ? SHELL_PAGE_INSET : undefined;
}

/** Outer wrapper for `Shell.PageBody` with `innerInset` (vertical rhythm only). */
export function shellPageBodyInnerWrapperClassName(variant: ShellPageBodyVariant): string {
  const tokens = pageBodyTokens[variant];
  return ['mx-auto w-full max-w-full min-w-0', tokens.top, tokens.bottom].join(' ');
}

/** Inner stack spacing for `Shell.PageBody` with `innerInset`. */
export function shellPageBodyInnerStackClassName(variant: ShellPageBodyVariant): string {
  return pageBodyTokens[variant].gap;
}
