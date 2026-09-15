import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { BrandMark } from './brand-mark';
import identity from './identity.json';

describe('BrandMark', () => {
  test('renders the canonical accessible mark', () => {
    const markup = renderToStaticMarkup(<BrandMark />);

    expect(markup).toContain(`aria-label="${identity.name}"`);
    for (const path of identity.geometry.routePaths) {
      expect(markup).toContain(`d="${path}"`);
    }
  });

  test('can be decorative and monochrome', () => {
    const markup = renderToStaticMarkup(<BrandMark decorative monochrome />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-label');
    expect(markup).toContain('currentColor');
  });
});
