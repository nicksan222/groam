import { expect, test } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { openSite, sitePages } from './site-frame';

const italianPath = (path: (typeof sitePages)[number]) => (path === '/' ? '/it/' : `/it${path}`);

const italianTitles: Record<(typeof sitePages)[number], string> = {
  '/': 'Groam · Pianifica insieme i viaggi di gruppo',
  '/features/': 'Funzioni · Groam',
  '/features/itinerary/': 'Itinerario · Groam',
  '/features/ideas/': 'Idee · Groam',
  '/features/issues/': 'Problemi · Groam',
  '/features/conversations/': 'Chat · Groam',
  '/features/ai/': 'AI · Groam',
  '/pricing/': 'Prezzi · Groam',
  '/privacy/': 'Privacy · Groam',
  '/terms/': 'Termini · Groam'
};

const meta = (document: Document, selector: string) =>
  document.querySelector(selector)?.getAttribute('content') ?? '';

const expectNoHorizontalOverflow = (document: Document, path: string) => {
  const { clientWidth, scrollWidth } = document.documentElement;
  if (scrollWidth > clientWidth) {
    throw new Error(`${path} overflows horizontally: ${scrollWidth}px > ${clientWidth}px`);
  }
};

test('every Italian page publishes localized metadata and equivalent language links', async () => {
  for (const path of sitePages) {
    const localized = italianPath(path);
    const { document } = await openSite(localized, { reducedMotion: true });
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    const description = meta(document, 'meta[name="description"]');

    expect(document.documentElement.lang).toBe('it');
    expect(document.title).toBe(italianTitles[path]);
    expect(description).toBeTruthy();
    expect(meta(document, 'meta[property="og:title"]')).toBe(document.title);
    expect(meta(document, 'meta[property="og:description"]')).toBe(description);
    expect(meta(document, 'meta[name="twitter:title"]')).toBe(document.title);
    expect(meta(document, 'meta[name="twitter:description"]')).toBe(description);
    expect(meta(document, 'meta[property="og:locale"]')).toBe('it_IT');
    expect(meta(document, 'meta[property="og:locale:alternate"]')).toBe('en_US');
    expect(new URL(canonical).pathname).toBe(localized);

    const alternate = (language: string) =>
      document
        .querySelector(`link[rel="alternate"][hreflang="${language}"]`)
        ?.getAttribute('href') ?? '';
    expect(new URL(alternate('en')).pathname).toBe(path);
    expect(new URL(alternate('it')).pathname).toBe(localized);
    expect(new URL(alternate('x-default')).pathname).toBe(path);

    const languageLink = (language: 'en' | 'it') =>
      document.querySelector<HTMLAnchorElement>(`[data-language-link][hreflang="${language}"]`);
    expect(languageLink('en')?.getAttribute('href')).toBe(path);
    expect(languageLink('it')?.getAttribute('href')).toBe(localized);
    expect(languageLink('en')?.hasAttribute('aria-current')).toBe(false);
    expect(languageLink('it')?.getAttribute('aria-current')).toBe('true');
    expect(await commands.takeErrors()).toEqual([]);
  }
});

test.each([320, 390, 1440])(
  'every Italian page fits %ipx without sideways scrolling',
  async (width) => {
    for (const path of sitePages) {
      const localized = italianPath(path);
      const { document } = await openSite(localized, {
        width,
        height: 900,
        reducedMotion: true
      });
      expectNoHorizontalOverflow(document, localized);
      expect(await commands.takeErrors()).toEqual([]);
    }
  }
);

test('Italian AI tabs and journey keep localized copy while their state changes', async () => {
  const { document } = await openSite('/it/features/ai/', { reducedMotion: true });
  const workspace = document.querySelector('[data-ai-demo]');
  const research = workspace?.querySelector<HTMLButtonElement>('[data-screen="research"]');
  const polls = workspace?.querySelector<HTMLButtonElement>('[data-screen="polls"]');

  expect(research?.textContent?.trim()).toBe('Ricerca');
  research?.click();
  expect(research?.getAttribute('aria-selected')).toBe('true');
  expect(workspace?.querySelector<HTMLElement>('[data-panel="research"]')?.checkVisibility()).toBe(
    true
  );
  expect(workspace?.querySelector('[data-context-text]')?.textContent).toContain('Ricerca');

  expect(polls?.textContent?.trim()).toBe('Sondaggi');
  polls?.click();
  expect(polls?.getAttribute('aria-selected')).toBe('true');
  expect(workspace?.querySelector<HTMLElement>('[data-panel="polls"]')?.checkVisibility()).toBe(
    true
  );

  const journey = document.querySelector<HTMLElement>('[data-ai-journey]');
  const steps = [...(journey?.querySelectorAll<HTMLButtonElement>('[data-journey-step]') ?? [])];
  expect(steps[0]?.textContent).toContain('Richiesta');
  expect(steps.at(-1)?.textContent).toContain('Applicata');
  steps[0]?.click();
  expect(journey?.dataset.aiState).toBe('unchanged');
  expect(journey?.querySelector('[data-journey-state]')?.textContent).toContain(
    'Piano condiviso invariato'
  );
  steps.at(-1)?.click();
  expect(journey?.dataset.aiState).toBe('applied');
  expect(journey?.querySelector('[data-journey-state]')?.textContent).toContain(
    'Piano condiviso aggiornato'
  );
  expect(await commands.takeErrors()).toEqual([]);
});

test('the Italian pricing calculator keeps updates localized', async () => {
  const { document } = await openSite('/it/pricing/', { reducedMotion: true });
  const total = () => document.querySelector('[data-total]')?.textContent?.trim();
  const invited = document.querySelector<HTMLInputElement>('[data-input="invited"]');
  const more = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Un viaggiatore invitato in più"]'
  );
  const fewer = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Un viaggiatore invitato in meno"]'
  );

  expect(total()).toBe('3 € per questo viaggio.');
  expect(invited?.getAttribute('aria-valuetext')).toBe('3 viaggiatori invitati');
  more?.click();
  await expect.poll(total).toBe('4 € per questo viaggio.');
  expect(invited?.getAttribute('aria-valuetext')).toBe('4 viaggiatori invitati');
  fewer?.click();
  await expect.poll(total).toBe('3 € per questo viaggio.');
  expect(await commands.takeErrors()).toEqual([]);
});

test('applying and reopening an Italian issue keeps its state labels translated', async () => {
  const { document } = await openSite('/it/features/issues/', { reducedMotion: true });
  const flow = document.querySelector('[data-issue-flow]');
  const card = flow?.querySelector<HTMLElement>('[data-card]');
  card?.querySelector<HTMLButtonElement>('[data-apply-card]')?.click();
  expect(card?.dataset.state).toBe('closed');
  expect(card?.querySelector('.chip')?.textContent).toBe('Idea applicata');
  flow?.querySelector<HTMLButtonElement>('[data-reset]')?.click();
  expect(card?.dataset.state).toBe('open');
  expect(card?.querySelector('.chip')?.textContent).toBe('Idea collegata');
  expect(await commands.takeErrors()).toEqual([]);
});

test('Italian not-found pages retain their language and stay out of search indexes', async () => {
  const { document } = await openSite('/it/404/', { reducedMotion: true });
  expect(document.documentElement.lang).toBe('it');
  expect(meta(document, 'meta[name="robots"]')).toBe('noindex');
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  expect(document.querySelector('a[data-language-link][lang="en"]')?.getAttribute('href')).toBe(
    '/404.html'
  );
  expect(document.querySelector('a[data-language-link][lang="it"]')?.getAttribute('href')).toBe(
    '/it/404/'
  );
  expect(document.querySelector('h1')?.textContent).toContain('indirizzo');
  expect(await commands.takeErrors()).toEqual([]);
});
