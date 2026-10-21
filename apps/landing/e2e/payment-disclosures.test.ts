import { expect, test } from 'vite-plus/test';
import { openSite } from './site-frame';

/** Facts every pricing and legal page states: price, who is free, coverage, existing trips, refunds. */
const pricingFacts = {
  en: [
    /€1 per trip|€1 through Stripe Checkout/u,
    /trip creator/iu,
    /organizer covers|organizer to cover/u,
    /existing trips stay free|created before payments started stay free/iu,
    /refunded automatically/u
  ],
  it: [
    /1 € per viaggio|1 € tramite Stripe Checkout/u,
    /Chi crea il viaggio non paga|creatore del viaggio/u,
    /organizzatore/u,
    /viaggi esistenti restano gratuiti|prima dell’attivazione dei pagamenti restano gratuiti/u,
    /rimborsato automaticamente/u
  ]
};

/** The legal pages also scope the seat to trip pages and keep the legal review note. */
const legalFacts = {
  en: [
    /always see content shared with the whole group/u,
    /only that trip’s pages require a seat/u,
    /legal review/u
  ],
  it: [
    /possono sempre vedere i contenuti condivisi con tutto il gruppo/u,
    /solo le pagine di quel viaggio richiedono un posto/u,
    /revisione del titolare e di un legale/u
  ]
};

const stale =
  /not live yet|nobody is charged today|apply to every trip|including trips created before|non sono ancora attivi|si applicano a tutti i viaggi/iu;

test.each([
  ['/terms/', 'en', true],
  ['/privacy/', 'en', true],
  ['/pricing/', 'en', false],
  ['/it/terms/', 'it', true],
  ['/it/privacy/', 'it', true],
  ['/it/pricing/', 'it', false]
] as const)('%s discloses the payment policy', async (path, locale, legal) => {
  const { document } = await openSite(path, { reducedMotion: true });
  const text = document.body.textContent ?? '';
  const facts = [...pricingFacts[locale], ...(legal ? legalFacts[locale] : [])];
  for (const fact of facts) expect(text).toMatch(fact);
  expect(text).not.toMatch(stale);
});

test.each(['/', '/it/'])(
  'structured pricing on %s drops the stale preorder offer',
  async (path) => {
    const { document } = await openSite(path, { reducedMotion: true });
    const data = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    ) as { offers?: { availability?: string; description?: string }[] };
    const offers = data.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) expect(offer).not.toHaveProperty('availability');
    expect(offers.map((offer) => offer.description).join(' ')).not.toMatch(stale);
  }
);
