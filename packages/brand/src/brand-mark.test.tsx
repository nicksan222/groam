import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vite-plus/test';
import { BrandMark } from './brand-mark';
import identity from './identity.json';

describe('BrandMark', () => {
  test('renders the canonical accessible mark', () => {
    const markup = renderToStaticMarkup(<BrandMark />);

    expect(markup).toContain(`aria-label="${identity.name}"`);
    expect(markup).toContain(`d="${identity.geometry.agentPin}"`);
    expect(markup).toContain(`d="${identity.geometry.humanPin}${identity.geometry.humanHole}"`);
    expect(markup).toContain(`fill="${identity.colors.frame}"`);
  });

  test('can be decorative and monochrome', () => {
    const markup = renderToStaticMarkup(<BrandMark decorative monochrome />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-label');
    expect(markup).toContain('currentColor');
    expect(markup).not.toContain(identity.colors.frame);
  });
});
