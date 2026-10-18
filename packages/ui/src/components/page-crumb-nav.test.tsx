import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PageCrumbNav } from './page-crumb-nav';

test('renders a parent back link, extra crumb, and current page', async () => {
  await render(
    <PageCrumbNav
      crumbs={[{ href: '/trips/atlantic', label: 'Atlantic week' }]}
      current="Split long weekend"
      parent={{ href: '/ideas', label: 'All ideas' }}
    />
  );

  const nav = page.getByRole('navigation', { name: 'breadcrumb' }).element();
  expect(nav.getAttribute('data-slot')).toBe('page-crumb-nav');
  expect(nav.className).toContain('px-4');
  expect(nav.className).toContain('py-2.5');
  expect(nav.className).toContain('text-xs');
  expect(nav.className).toContain('text-muted-foreground');

  const parent = page.getByRole('link', { name: 'All ideas' }).element();
  expect(parent.getAttribute('href')).toBe('/ideas');
  expect(parent.querySelector('svg')).toBeTruthy();

  await expect
    .element(page.getByRole('link', { name: 'Atlantic week' }))
    .toHaveAttribute('href', '/trips/atlantic');
  await expect
    .element(page.getByText('Split long weekend'))
    .toHaveAttribute('aria-current', 'page');
  expect(nav.textContent).toMatch(/All ideas\s*\/\s*Atlantic week\s*\/\s*Split long weekend/u);
});

test('merges a router Link through asChild without requiring href', async () => {
  await render(
    <PageCrumbNav
      parent={{
        asChild: true,
        children: <a href="/issues">placeholder</a>,
        label: 'All issues'
      }}
    />
  );

  const link = page.getByRole('link', { name: 'All issues' }).element();
  expect(link.getAttribute('href')).toBe('/issues');
  expect(link.textContent).not.toContain('placeholder');
});

test('fires onClick on a parent button when no href is provided', async () => {
  const onClick = vi.fn();
  await render(<PageCrumbNav parent={{ label: 'All trips', onClick }} />);

  await page.getByRole('button', { name: 'All trips' }).click();
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('drops inset padding when nested in an already-padded header', async () => {
  await render(
    <PageCrumbNav
      className="max-w-full"
      inset={false}
      parent={{ href: '/ideas', label: 'All ideas' }}
    />
  );

  const nav = page.getByRole('navigation', { name: 'breadcrumb' }).element();
  expect(nav.className).toContain('max-w-full');
  expect(nav.className).not.toContain('px-4');
  expect(nav.className).not.toContain('py-2.5');
});

test('shows a skeleton current crumb while loading', async () => {
  const { container } = await render(
    <PageCrumbNav isLoading parent={{ href: '/trips', label: 'All trips' }} />
  );

  await expect.element(page.getByRole('link', { name: 'All trips' })).toBeInTheDocument();
  expect(container.querySelector('[data-slot="page-crumb-loading"]')).toBeTruthy();
  await expect.element(page.getByText('Atlantic week')).not.toBeInTheDocument();
});

test('keeps intermediate crumbs while the current crumb loads', async () => {
  const { container } = await render(
    <PageCrumbNav
      crumbs={[{ href: '/ideas', label: 'Ideas' }]}
      isLoading
      parent={{ href: '/trips/1', label: 'Atlantic week' }}
    />
  );

  await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Ideas' })).toBeInTheDocument();
  expect(container.querySelector('[data-slot="page-crumb-loading"]')).toBeTruthy();
});
