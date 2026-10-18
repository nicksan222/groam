import { expect, test } from 'vite-plus/test';
import { openSite, sitePages } from './site-frame';

const featurePages = ['itinerary', 'ideas', 'issues', 'conversations', 'ai'];

for (const width of [390, 1440, 1920]) {
  test.each(featurePages)(
    '%s: the hero demo fills the shared content width at ' + width + 'px',
    async (slug) => {
      const { document } = await openSite(`/features/${slug}/`, { width, reducedMotion: true });
      const content = document.querySelector('[data-page-section] [data-section-content]');
      const demo = document.querySelector('[data-page-demo] > figure');
      if (!content || !demo) throw new Error('Missing shared hero frame');
      const style = document.defaultView?.getComputedStyle(content);
      const bounds = content.getBoundingClientRect();
      expect(demo.getBoundingClientRect().left).toBeCloseTo(
        bounds.left + parseFloat(style?.paddingLeft ?? '0'),
        0
      );
      expect(demo.getBoundingClientRect().right).toBeCloseTo(
        bounds.right - parseFloat(style?.paddingRight ?? '0'),
        0
      );
    }
  );
}

test.each(sitePages)('%s: sections share horizontal rails and one spacing scale', async (path) => {
  const { document } = await openSite(path, { width: 1440, reducedMotion: true });
  const sections = [...document.querySelectorAll<HTMLElement>('[data-page-section]')];
  expect(sections.length).toBeGreaterThan(1);
  const first = sections[0]?.querySelector('[data-section-content]')?.getBoundingClientRect();
  const bill = sections.find((section) => section.dataset.sectionTone === 'bill');
  if (!bill) throw new Error('Missing page intro');
  const sectionSpace = parseFloat(document.defaultView?.getComputedStyle(bill).paddingTop ?? '0');
  for (const section of document.querySelectorAll('main > section')) {
    expect(section.matches('[data-page-section], .ribbon')).toBe(true);
  }
  for (const section of sections) {
    const content = section.querySelector('[data-section-content]')?.getBoundingClientRect();
    expect(content?.left).toBe(first?.left);
    expect(content?.right).toBe(first?.right);
    const padding = parseFloat(document.defaultView?.getComputedStyle(section).paddingTop ?? '0');
    // The hero can reserve extra space below for its overlapping demo, but all section starts agree.
    expect(padding).toBe(section.dataset.sectionTone === 'paper' ? sectionSpace / 2 : sectionSpace);
  }
});
