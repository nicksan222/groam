import { commands, page } from 'vite-plus/test/browser';

export type SiteFrame = {
  /** Locators scoped to the page inside the frame. */
  site: ReturnType<typeof page.frameLocator>;
  window: Window;
  document: Document;
};

let current: HTMLIFrameElement | undefined;

/**
 * Opens a page of the built site (served from dist/ by the test server) in a same-origin
 * frame at the given viewport, and records the errors it raises.
 */
export async function openSite(
  path: string,
  { width = 1280, height = 800, reducedMotion = false } = {}
): Promise<SiteFrame> {
  current?.remove();
  const frame = document.createElement('iframe');
  frame.title = 'Groam site';
  frame.style.cssText = `width:${width}px;height:${height}px;border:0;display:block`;
  document.body.append(frame);
  current = frame;

  await commands.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await commands.watchErrors();
  await new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });
    // The test server answers directory URLs with its own runner page, so ask for the file.
    frame.src = path.endsWith('/') ? `${path}index.html` : path;
  });
  const win = frame.contentWindow;
  if (!win) throw new Error(`No window for ${path}`);
  await win.document.fonts.ready;
  return {
    site: page.frameLocator(page.elementLocator(frame)),
    window: win,
    document: win.document
  };
}

export const sitePages = [
  '/',
  '/features/',
  '/features/itinerary/',
  '/features/ideas/',
  '/features/issues/',
  '/features/conversations/',
  '/features/ai/',
  '/pricing/',
  '/privacy/',
  '/terms/'
] as const;
