import type { CSSProperties } from 'react';

/**
 * Shared horizontal inset for workspace pages (home, lists, settings, group, issues).
 */
export const SHELL_PAGE_INSET = 'px-4 md:px-6';

/**
 * The one gap between a page header and its body: 16px on phones, 24px from `md`. The header's
 * bottom padding owns it, once (the facts line adds none); no body adds top padding.
 */
export const SHELL_HEADER_BODY_GAP = 'pb-4 md:pb-6';

/**
 * The page header's own padding. On phones it is a compact bar; from `md` the header's row is a
 * fixed height (`SHELL_HEADER_ROW`) so it needs no top padding.
 */
export const SHELL_HEADER_PADDING = `${SHELL_PAGE_INSET} ${SHELL_HEADER_BODY_GAP} pt-3 md:pt-0`;

/** The sidebar header's padding around the trip switcher card (`SidebarHeader` is `p-2`). */
export const SHELL_SIDEBAR_HEADER_INSET_PX = 8;

/** Height of the trip switcher card in the sidebar header (`min-h-14` plus its 1.5px of border). */
export const SHELL_TRIP_SWITCHER_HEIGHT_PX = 57.5;

/**
 * Vertical centre of the sidebar's trip switcher card, measured from the top of the window: the
 * sidebar inset plus half the card. A page header's title row is centred on this line.
 */
export const SHELL_TRIP_SWITCHER_CENTER_PX =
  SHELL_SIDEBAR_HEADER_INSET_PX + SHELL_TRIP_SWITCHER_HEIGHT_PX / 2;

/**
 * Height of a page header's title row from `md`: twice `SHELL_TRIP_SWITCHER_CENTER_PX`, so the
 * row's centre (and with it the title) sits on the centre of the trip switcher card.
 */
export const SHELL_HEADER_ROW_PX = SHELL_TRIP_SWITCHER_CENTER_PX * 2;

/** The row height as a CSS variable, set on the header (`SHELL_HEADER_ROW_STYLE`) and read here. */
export const SHELL_HEADER_ROW = 'md:h-(--shell-header-row)';

/** Inline style that defines `--shell-header-row` from the sidebar metrics above. */
export const SHELL_HEADER_ROW_STYLE = {
  '--shell-header-row': `${SHELL_HEADER_ROW_PX}px`
} as CSSProperties;

/** How far the facts line is pulled up under the title row so it hangs directly below the title. */
export const SHELL_HEADER_META_PULL = 'md:-mt-3';

/** The facts line directly under a page title. */
export const SHELL_HEADER_META = 'text-sm leading-5 text-muted-foreground';

/**
 * One fact in a header's facts line. Every fact carries a leading middle dot in a 16px slot; the
 * facts line shifts its row 16px left and clips it (`SHELL_HEADER_META_CLIP`), so the dot that opens
 * a line, the first one or one a wrap carried over, is always hidden and no line starts with a dot.
 */
export const SHELL_HEADER_FACT =
  'inline-flex min-w-0 items-center before:inline-block before:w-4 before:shrink-0 before:text-center before:content-["·"]';

/** The facts line's clip and its row: the row starts one dot slot left of the clip edge. */
export const SHELL_HEADER_META_CLIP = '-mx-1 -my-1 min-w-0 overflow-hidden px-1 py-1';
export const SHELL_HEADER_META_ROW = '-ml-4 flex min-w-0 flex-wrap items-center';

/** Widest a padded page grows; centred when the window is wider. */
export const SHELL_PAGE_MAX_WIDTH = 'mx-auto w-full max-w-[1600px]';

/**
 * Bottom padding of a padded page. On phones it clears the action dock (`SHELL_DOCK`): the 16px
 * offset, a 48px primary, a 12px gap and a 40px secondary, plus the safe area. From `md` it is 32px.
 */
export const SHELL_PAGE_BOTTOM =
  '[--shell-page-bottom:calc(7.5rem+env(safe-area-inset-bottom,0px))] pb-[var(--shell-page-bottom)] md:[--shell-page-bottom:2rem]';

/** Same clearance as `SHELL_PAGE_BOTTOM`; kept for pages that name it (`clearNav`). */
export const SHELL_PAGE_BOTTOM_NAV = SHELL_PAGE_BOTTOM;

/** Bottom padding of a scrolling pane inside a bleed page: clears the action dock on phones. */
export const SHELL_PANE_BOTTOM_NAV = 'pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0';

/**
 * The action dock: a header's `actions` on phones. A fixed vertical stack at the bottom-right, in the
 * order the page passes the actions (secondary above, the one primary lowest, under the thumb). Its
 * bottom is 16px plus the safe area plus `--shell-dock-lift` (0 unless the page sets it, see
 * `SHELL_DOCK_LIFT_COMPOSER`). It sits above content (`z-30`) and below dialogs, sheets, menus and
 * toasts (`z-50`). From `md` it is the plain inline row at the right of the title row. Phones hide
 * it while a text field has focus (`workspace.css`).
 */
export const SHELL_DOCK =
  'flex items-center justify-end gap-2 empty:hidden max-md:fixed max-md:right-4 max-md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px)+var(--shell-dock-lift,0px))] max-md:z-30 max-md:flex-col max-md:items-end max-md:gap-3';

/**
 * `Shell.Action` below `md`: a round icon-only button. `primary` is a 48px filled circle,
 * `secondary` a 40px circle on the popover surface with a hairline border. Press shrinks it a touch.
 */
export const SHELL_ACTION_PHONE = {
  primary:
    'max-md:size-12 max-md:rounded-full max-md:p-0 max-md:shadow-lg max-md:active:scale-95 motion-reduce:max-md:active:scale-100',
  secondary:
    'max-md:size-10 max-md:rounded-full max-md:border-border max-md:bg-popover max-md:p-0 max-md:text-foreground max-md:shadow-md max-md:active:scale-95 max-md:dark:bg-popover motion-reduce:max-md:active:scale-100'
} as const;

/**
 * Set on a page root (`Shell.BannerLayout dockLift`) whose body ends in a pinned composer: lifts
 * the dock by the composer's height so it floats above the send button instead of on it.
 */
export const SHELL_DOCK_LIFT_COMPOSER = '[--shell-dock-lift:5.5rem] md:[--shell-dock-lift:0px]';

/** Vertical rhythm between the top-level blocks of a padded page. */
export const SHELL_PAGE_RHYTHM = 'space-y-6 sm:space-y-8';

/**
 * Edge inset for content inside a `bleed` page, so its first edge lines up with the header
 * (`SHELL_PAGE_INSET`) and with padded pages.
 */
export const SHELL_BLEED_INSET = SHELL_PAGE_INSET;

/** Scroll-snap padding that matches `SHELL_BLEED_INSET` for horizontally scrolling lanes. */
export const SHELL_BLEED_SCROLL_INSET = 'scroll-px-4 md:scroll-px-6';

/** Page title typography (`Shell.Title`). */
export const SHELL_TITLE_TEXT =
  'text-xl font-semibold leading-tight tracking-tight text-foreground';

/** Page title in the page header (`Shell.Title`). */
export const SHELL_TITLE = `m-0 p-0 ${SHELL_TITLE_TEXT}`;

/** Muted description line under a section heading. */
export const SHELL_DESCRIPTION = 'text-sm leading-6 text-muted-foreground';

/** In-page section heading (`Shell.SectionHeader`, card titles). */
export const SHELL_SECTION_TITLE = 'text-lg font-semibold tracking-tight text-foreground';

/** Standard scrollable section block beneath a page body header. */
export const SHELL_SECTION_BASE = 'dashboard-reveal min-w-0 max-w-full';

export type ShellStackDensity = 'lg' | 'md' | 'none' | 'page' | 'sm';

const stackDensityTokens: Record<ShellStackDensity, string> = {
  lg: 'space-y-6',
  md: 'space-y-4',
  none: '',
  page: SHELL_PAGE_RHYTHM,
  sm: 'space-y-3'
};

/** Vertical rhythm for `Shell.Stack`, `Shell.Section`, and column panes. */
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
export const SHELL_UNDERLINE_NAV = 'w-full min-w-0 border-b border-border';

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
  'flex min-w-0 items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 lg:block lg:px-4 lg:py-3';

/**
 * Contained outline well for hints, notices, and property blocks.
 * Border only — hierarchy comes from the stronger outer stroke.
 */
export const SHELL_SURFACE_WELL = 'rounded-xl border border-border';

export type ShellPageLayout = 'bleed' | 'padded';

/**
 * Class names for `Shell.PageBody`, the one body under every page header.
 * `padded`: inset, 1600px max width, 24/32px rhythm, 32px bottom; a flex column that grows to the
 * pane's height, so a `List fill` footer rests at the bottom of a short page. `bleed`: fills the pane with no
 * inset, for Calendar and chat; its content aligns itself with `SHELL_BLEED_INSET`.
 */
export function shellPageBodyClassName({
  className,
  clearNav = false,
  layout = 'padded'
}: {
  className?: string;
  clearNav?: boolean;
  layout?: ShellPageLayout;
} = {}): string {
  const base =
    layout === 'bleed'
      ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col'
      : [
          SHELL_PAGE_MAX_WIDTH,
          'flex min-w-0 flex-1 shrink-0 flex-col pt-0',
          SHELL_PAGE_INSET,
          clearNav ? SHELL_PAGE_BOTTOM_NAV : SHELL_PAGE_BOTTOM,
          SHELL_PAGE_RHYTHM
        ].join(' ');
  return [base, className].filter(Boolean).join(' ');
}
