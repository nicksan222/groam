// Renders public/og.png (1200x630) and public/apple-touch-icon.png from scripts/og.html and the brand mark.
// Run with `vp run og:render` from apps/landing.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url);
const font = new URL(
  import.meta
    .resolve('@fontsource-variable/google-sans-flex/files/google-sans-flex-latin-wght-normal.woff2')
);
const identity = JSON.parse(
  readFileSync(new URL('../../packages/brand/src/identity.json', root), 'utf8')
) as { colors: { frame: string } };
const template = readFileSync(new URL('scripts/og.html', root), 'utf8').replace(
  'FONT_URL',
  font.href
);

const { features } = await import('@/content/site');
const { pricingIntro } = await import('@/content/pricing');
const { hubHeadline } = await import('@/content/features-hub');
const { exampleTrip, saturdayAfter, sintraIdea, tripIssues } =
  await import('@/content/example-trip');
const { chatEvents } = await import('@/content/feature-conversations');
const escape = (text: string) => text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;');

type Row = [color: string, initial: string, title: string, sub: string];
const label = (text: string) => `<div class="label">${escape(text)}</div>`;
const rows = (items: Row[]) =>
  items
    .map(
      ([color, initial, title, sub]) =>
        `<div class="row"><div class="av c-${color}">${initial}</div><div><b>${escape(title)}</b><span>${escape(sub)}</span></div></div>`
    )
    .join('');
const plan = (items: readonly { time: string; title: string }[], kind = '') =>
  items
    .map(
      (stop) =>
        `<div class="plan ${kind}"><span class="time">${stop.time}</span><span>${escape(stop.title)}</span></div>`
    )
    .join('');
const chat = chatEvents
  .filter((event) => event.kind !== 'react')
  .slice(0, 2)
  .map((event, index) => {
    const who = 'who' in event ? event.who : 'maya';
    const name = who.charAt(0).toUpperCase() + who.slice(1);
    return `<div class="bubble ${index ? 'me' : ''}"><b>${name}</b>${escape('text' in event ? event.text : '')}</div>`;
  })
  .join('');
const activity =
  label(`Example trip: ${exampleTrip.name}`) +
  rows([
    ['pink', 'M', 'Maya opened an idea', sintraIdea.title],
    ['mauve', 'P', 'Priya approved the idea', sintraIdea.title],
    ['sky', 'AI', 'Itinerary agent reviewed the idea', sintraIdea.agentNote],
    ['pink', 'M', 'Maya applied the idea', 'Saturday is now Sintra for everyone']
  ]);
const issue = tripIssues[2];
const panels: Record<string, string> = {
  home: activity,
  features: activity,
  privacy: activity,
  terms: activity,
  itinerary: label('Example trip: Saturday') + plan(saturdayAfter.slice(0, 4)),
  ideas:
    label(`Example idea: ${sintraIdea.title}`) +
    plan(sintraIdea.removes.slice(0, 2), 'del') +
    plan(sintraIdea.adds.slice(0, 3), 'add'),
  issues:
    label('Example trip: issues') +
    `<div class="row"><div class="av c-green">OK</div><div><b>${escape(issue.title)}</b><span>${escape(`Closed when ${issue.fix} was applied, ${sintraIdea.appliedAt}`)}</span></div></div>`,
  conversations: label('Example trip: chat') + chat,
  ai:
    label('Example trip: ask the agent') +
    `<div class="bubble me"><b>You</b>Does the Sintra idea clash with anything?</div><div class="bubble"><b>Agent</b>${escape(sintraIdea.clashCheck)}</div>`,
  pricing:
    label('Example trip: a group of four') +
    rows([
      ['pink', 'M', 'Maya, organizer', 'Free'],
      ['green', 'J', 'Jonas', '€1'],
      ['mauve', 'P', 'Priya', '€1'],
      ['peach', 'S', 'Sam', '€1']
    ])
};
// One card per page; the path is public/og/<slug>.png, matching the layout's og:image.
const cards: [string, string][] = [
  ['home', 'Plan together.<br />Go further.'],
  ['features', escape(hubHeadline)],
  ['pricing', escape(pricingIntro.title)],
  ['privacy', 'Privacy'],
  ['terms', 'Terms'],
  ...features.map((feature): [string, string] => [feature.slug, escape(feature.headline)])
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const temp = new URL('scripts/.og-render.html', root);
mkdirSync(new URL('public/og/', root), { recursive: true });
for (const [slug, headline] of cards) {
  writeFileSync(
    temp,
    template.replace('HEADLINE', headline).replace('PANEL', panels[slug] ?? activity)
  );
  await page.goto(temp.href);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  writeFileSync(new URL(`public/og/${slug}.png`, root), png);
  if (slug === 'home') writeFileSync(new URL('public/og.png', root), png);
}

const mark = readFileSync(new URL('../../packages/brand/assets/mark.svg', root), 'utf8');
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<body style="margin:0;background:${identity.colors.frame}">${mark.replace('<svg ', '<svg width="180" height="180" ')}</body>`
);
writeFileSync(new URL('public/apple-touch-icon.png', root), await icon.screenshot({ type: 'png' }));
rmSync(temp);
await browser.close();
