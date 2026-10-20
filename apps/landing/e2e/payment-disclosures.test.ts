import { expect, test } from 'vite-plus/test';
import { openSite } from './site-frame';

test.each([
  ['/terms/', 'pricing', 'The trip creator is free.', 'Existing trips stay free'],
  ['/privacy/', 'payments', 'The trip creator is free.', 'Existing trips stay free'],
  ['/it/terms/', 'pricing', 'Chi crea il viaggio non paga.', 'I viaggi esistenti restano gratuiti'],
  [
    '/it/privacy/',
    'payments',
    'Chi crea il viaggio non paga.',
    'I viaggi esistenti restano gratuiti'
  ]
])(
  'payment disclosure on %s matches conditional Checkout behavior',
  async (path, section, creator, existing) => {
    const { document } = await openSite(path, { reducedMotion: true });
    const text = document.getElementById(section)?.textContent ?? '';
    expect(text).toContain('Stripe Checkout');
    expect(text).toContain(creator);
    expect(text).toContain(existing);
    expect(text).toMatch(
      /payments are skipped when Stripe is not configured|se Stripe non è configurato/u
    );
    expect(text).not.toMatch(/not live yet|nobody is charged today|non sono ancora attivi/u);
    expect(document.body.textContent).toMatch(/owner and legal review|titolare e di un legale/u);
  }
);

test.each(['/', '/it/'])(
  'structured pricing on %s describes payment configuration honestly',
  async (path) => {
    const { document } = await openSite(path, { reducedMotion: true });
    const data = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    ) as {
      offers?: { description?: string }[];
    };
    const description = data.offers?.map((offer) => offer.description ?? '').join(' ') ?? '';
    expect(description).toContain('Stripe Checkout');
    expect(description).toMatch(/payments are enabled|pagamenti sono abilitati/u);
    expect(description).not.toMatch(/not live yet|non sono ancora attivi/u);
  }
);
