import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PageCrumbNav } from './page-crumb-nav';

afterEach(cleanup);

test('renders a parent back link, extra crumb, and current page', () => {
  render(
    <PageCrumbNav
      crumbs={[{ href: '/trips/atlantic', label: 'Atlantic week' }]}
      current="Split long weekend"
      parent={{ href: '/ideas', label: 'All ideas' }}
    />
  );

  const nav = screen.getByRole('navigation', { name: 'breadcrumb' });
  expect(nav.getAttribute('data-slot')).toBe('page-crumb-nav');
  expect(nav.className).toContain('px-4');
  expect(nav.className).toContain('py-2.5');
  expect(nav.className).toContain('text-xs');
  expect(nav.className).toContain('text-muted-foreground');

  const parent = screen.getByRole('link', { name: 'All ideas' });
  expect(parent.getAttribute('href')).toBe('/ideas');
  expect(parent.querySelector('svg')).toBeTruthy();

  expect(screen.getByRole('link', { name: 'Atlantic week' }).getAttribute('href')).toBe(
    '/trips/atlantic'
  );
  expect(screen.getByText('Split long weekend').getAttribute('aria-current')).toBe('page');
  expect(nav.textContent).toMatch(/All ideas\s*\/\s*Atlantic week\s*\/\s*Split long weekend/u);
});

test('merges a router Link through asChild without requiring href', () => {
  render(
    <PageCrumbNav
      parent={{
        asChild: true,
        children: <a href="/issues">placeholder</a>,
        label: 'All issues'
      }}
    />
  );

  const link = screen.getByRole('link', { name: 'All issues' });
  expect(link.getAttribute('href')).toBe('/issues');
  expect(link.textContent).not.toContain('placeholder');
});

test('fires onClick on a parent button when no href is provided', () => {
  const onClick = vi.fn();
  render(<PageCrumbNav parent={{ label: 'All trips', onClick }} />);

  fireEvent.click(screen.getByRole('button', { name: 'All trips' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('drops inset padding when nested in an already-padded header', () => {
  render(
    <PageCrumbNav
      className="max-w-full"
      inset={false}
      parent={{ href: '/ideas', label: 'All ideas' }}
    />
  );

  const nav = screen.getByRole('navigation', { name: 'breadcrumb' });
  expect(nav.className).toContain('max-w-full');
  expect(nav.className).not.toContain('px-4');
  expect(nav.className).not.toContain('py-2.5');
});

test('shows a skeleton current crumb while loading', () => {
  const { container } = render(
    <PageCrumbNav isLoading parent={{ href: '/trips', label: 'All trips' }} />
  );

  expect(screen.getByRole('link', { name: 'All trips' })).toBeTruthy();
  expect(container.querySelector('[data-slot="page-crumb-loading"]')).toBeTruthy();
  expect(screen.queryByText('Atlantic week')).toBeNull();
});

test('keeps intermediate crumbs while the current crumb loads', () => {
  const { container } = render(
    <PageCrumbNav
      crumbs={[{ href: '/ideas', label: 'Ideas' }]}
      isLoading
      parent={{ href: '/trips/1', label: 'Atlantic week' }}
    />
  );

  expect(screen.getByRole('link', { name: 'Atlantic week' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Ideas' })).toBeTruthy();
  expect(container.querySelector('[data-slot="page-crumb-loading"]')).toBeTruthy();
});
