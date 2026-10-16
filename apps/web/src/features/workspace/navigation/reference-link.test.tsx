import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ReferenceContext } from '@/features/workspace/hooks/reference-context';
import { Link } from './reference-link';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: ComponentProps<'a'> & { to: string }) => (
    <a data-kind="canonical" href={to}>
      {children}
    </a>
  )
}));

vi.mock('@/features/workspace/navigation/short-reference-link', () => ({
  ShortReferenceLink: ({ children }: ComponentProps<'a'>) => (
    <a data-kind="short" href="/short">
      {children}
    </a>
  )
}));

describe('Link', () => {
  test('renders the router link outside a reference context', async () => {
    await render(<Link to="/trips">Trips</Link>);
    const link = page.getByRole('link', { name: 'Trips' });
    await expect.element(link).toHaveAttribute('data-kind', 'canonical');
    await expect.element(link).toHaveAttribute('href', '/trips');
  });

  test('renders the short reference link inside a reference context', async () => {
    await render(
      <ReferenceContext value={{ tripId: 'long-id' }}>
        <Link to="/trips">Trips</Link>
      </ReferenceContext>
    );
    await expect
      .element(page.getByRole('link', { name: 'Trips' }))
      .toHaveAttribute('data-kind', 'short');
  });
});
