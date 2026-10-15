import { expect, onTestFinished } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { environment } from './environment';
import { css } from './locators';

const defaultViewport = { height: 800, width: 1280 } as const;

/** Resizes the browser viewport for this test only; it returns to the default afterwards. */
export async function setViewport(width: number, height: number): Promise<void> {
  onTestFinished(() => page.viewport(defaultViewport.width, defaultViewport.height));
  await page.viewport(width, height);
}

export function horizontalOverflow(): number {
  return document.documentElement.scrollWidth;
}

/** Let the browser resolve semantic tokens and CSS color keywords. */
export function resolvedBackground(value: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = value;
  probe.hidden = true;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return resolved;
}

const pageBody = () => css('[data-slot="shell-page-body"]');

/** Resolve the painted canvas, including transparent wrappers above the page body. */
export async function pageCanvas() {
  await expect.element(css('.trip-page-ready')).toBeVisible();
  const clear = resolvedBackground('transparent');
  const element = pageBody().element();
  let canvas: Element | null = element;
  while (canvas && getComputedStyle(canvas).backgroundColor === clear)
    canvas = canvas.parentElement;
  const frame = element.getBoundingClientRect();
  return {
    background: canvas ? getComputedStyle(canvas).backgroundColor : 'transparent',
    overflow: element.scrollWidth > element.clientWidth,
    padding: getComputedStyle(element).padding,
    width: Math.round(frame.width)
  };
}

/** Measure the standard primary/secondary shell layout at the current viewport. */
export async function twoColumnPageLayout() {
  await expect.element(css('.trip-page-ready')).toBeVisible();
  const element = pageBody().element();
  const grid = element.querySelector<HTMLElement>('[data-slot="shell-two-columns"]');
  const left = grid?.querySelector<HTMLElement>('[data-slot="shell-left-column"]');
  const right = grid?.querySelector<HTMLElement>('[data-slot="shell-right-column"]');
  if (!grid || !left || !right) throw new Error('Expected the standard two-column layout');
  const frame = element.getBoundingClientRect();
  const primary = left.getBoundingClientRect();
  const secondary = right.getBoundingClientRect();
  return {
    background: getComputedStyle(element).backgroundColor,
    columns: getComputedStyle(grid).gridTemplateColumns,
    gap: getComputedStyle(grid).gap,
    gridBackground: getComputedStyle(grid).backgroundColor,
    leftInset: Math.round(primary.left - frame.left),
    overflow: element.scrollWidth > element.clientWidth,
    padding: getComputedStyle(element).padding,
    rightWidth: Math.round(secondary.width),
    stacked: secondary.top >= primary.bottom,
    topInset: Math.round(primary.top - frame.top)
  };
}

/** The itinerary editor's width against the room its page body leaves it. */
export function itineraryEditorWidth() {
  const body = pageBody().element();
  const section = body.querySelector<HTMLElement>('section[aria-label="Itinerary editor"]');
  if (!section) throw new Error('Expected the itinerary content section');
  const style = getComputedStyle(body);
  return {
    available: Math.round(
      body.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight)
    ),
    content: Math.round(section.getBoundingClientRect().width)
  };
}

/** Emulates the system color scheme for this test only. */
export async function useColorScheme(scheme: 'dark' | 'light'): Promise<void> {
  onTestFinished(() => environment.emulateColorScheme(null));
  await environment.emulateColorScheme(scheme);
}
