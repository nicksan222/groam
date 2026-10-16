import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ShortReferenceLink } from './short-reference-link';

const state = vi.hoisted(() => ({ shortIds: {} as Record<string, string> }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params }: { children?: ReactNode; params?: unknown }) => (
    <a data-params={JSON.stringify(params ?? null)} href="/x">
      {children}
    </a>
  )
}));

vi.mock('@/features/workspace/hooks/use-reference-params', () => ({
  useReferenceParams: () => ({ ids: {}, loading: false, missing: false, shortIds: state.shortIds })
}));

beforeEach(() => {
  state.shortIds = {};
});

describe('ShortReferenceLink', () => {
  test.each([
    [
      'replaces matching params with short ids',
      { tripId: 'long' },
      { tripId: 'abc' },
      { tripId: 'abc' }
    ],
    [
      'keeps unrelated params',
      { slug: 'x', tripId: 'long' },
      { tripId: 'abc' },
      { slug: 'x', tripId: 'abc' }
    ],
    ['leaves params alone with no short ids', { tripId: 'long' }, {}, { tripId: 'long' }]
  ])('%s', async (_, params, shortIds, expected) => {
    state.shortIds = shortIds;
    await render(
      <ShortReferenceLink params={params as never} to={'/trips/$tripId' as never}>
        Open
      </ShortReferenceLink>
    );
    await expect
      .element(page.getByRole('link', { name: 'Open' }))
      .toHaveAttribute('data-params', JSON.stringify(expected));
  });

  test('passes through missing params', async () => {
    await render(<ShortReferenceLink to={'/trips' as never}>Open</ShortReferenceLink>);
    await expect
      .element(page.getByRole('link', { name: 'Open' }))
      .toHaveAttribute('data-params', 'null');
  });
});
