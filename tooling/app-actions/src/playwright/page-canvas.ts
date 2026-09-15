import { expect, type Page } from '@playwright/test';

/** Let the browser resolve semantic tokens and CSS color keywords. */
export async function resolvedBackground(page: Page, value: string) {
  return page.evaluate((background) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = background;
    probe.hidden = true;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved;
  }, value);
}

/** Resolve the painted canvas, including transparent wrappers above the page body. */
export async function pageCanvas(page: Page) {
  await expect(page.locator('.trip-page-ready')).toBeVisible();
  const transparent = await resolvedBackground(page, 'transparent');
  return page.locator('[data-slot="shell-page-body"]').evaluate((element, clear) => {
    let canvas: Element | null = element;
    while (canvas && getComputedStyle(canvas).backgroundColor === clear) {
      canvas = canvas.parentElement;
    }
    const frame = element.getBoundingClientRect();
    return {
      background: canvas ? getComputedStyle(canvas).backgroundColor : 'transparent',
      padding: getComputedStyle(element).padding,
      width: Math.round(frame.width),
      overflow: element.scrollWidth > element.clientWidth
    };
  }, transparent);
}

/** Measure the standard primary/secondary shell layout at the current viewport. */
export async function twoColumnPageLayout(page: Page) {
  await expect(page.locator('.trip-page-ready')).toBeVisible();
  return page.locator('[data-slot="shell-page-body"]').evaluate((element) => {
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
  });
}
