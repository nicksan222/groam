import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ReferenceContext, useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { CanonicalLink, Link } from '@/features/workspace/navigation/reference-link';
import { ReferenceContent } from '@/features/workspace/workspace-shell/reference-content';
import { ReferenceProvider } from '@/features/workspace/workspace-shell/reference-provider';

afterEach(cleanup);
beforeEach(() => {
  mocks.useQueries.mockClear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

const mocks = vi.hoisted(() => ({
  useQueries: vi.fn((queries: Record<string, { args: { reference: string } }>) =>
    Object.fromEntries(
      Object.entries(queries).map(([key, { args }]) => [
        key,
        args.reference === 'pending'
          ? undefined
          : ['abcdef', 'long-trip-id'].includes(args.reference)
            ? { id: 'long-trip-id', shortId: 'abcdef' }
            : null
      ])
    )
  )
}));

vi.mock('convex/react', () => ({
  useQueries: mocks.useQueries
}));

function mount(path: string) {
  const root = createRootRoute({
    component: () => (
      <ReferenceProvider>
        <aside aria-label="Workspace navigation">Your workspace</aside>
        <ReferenceContent>
          <Outlet />
        </ReferenceContent>
      </ReferenceProvider>
    )
  });
  const trip = createRoute({
    getParentRoute: () => root,
    path: '/trips/$tripId',
    component: () => {
      const { tripId } = useResolvedParams(trip.useParams());
      return (
        <>
          <span>Record: {tripId}</span>
          <Link params={{ tripId, section: 'overview' }} to="/trips/$tripId/$section">
            Overview
          </Link>
        </>
      );
    }
  });
  const router = createRouter({
    routeTree: root.addChildren([trip]),
    history: createMemoryHistory({ initialEntries: [path] })
  });
  render(<RouterProvider router={router} />);
  return router;
}

test('loads a short URL using the internal ID and renders short links', async () => {
  mount('/trips/abcdef');
  expect(await screen.findByText('Record: long-trip-id')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe(
    '/trips/abcdef/overview'
  );
});

test('canonicalizes an existing long link without losing search or hash', async () => {
  const router = mount('/trips/long-trip-id?focus=map#details');
  await screen.findByText('Record: long-trip-id');
  await waitFor(() => expect(router.state.location.pathname).toBe('/trips/abcdef'));
  expect(router.state.location.searchStr).toContain('focus=map');
  expect(router.state.location.hash).toBe('details');
});

test('does not render a record when its short reference is unavailable', async () => {
  mount('/trips/zzzzzz');
  expect(await screen.findByText('This page was not found or is unavailable to you.')).toBeTruthy();
  expect(screen.queryByText('Record: long-trip-id')).toBeNull();
});

test('keeps workspace navigation mounted while an idea reference loads', async () => {
  mount('/trips/pending');
  expect(await screen.findByRole('status', { name: 'Opening page…' })).toBeTruthy();
  expect(screen.getByRole('complementary', { name: 'Workspace navigation' })).toBeTruthy();
  expect(screen.queryByText('Record: pending')).toBeNull();
});

test('renders a known canonical reference without resolving it again', async () => {
  const root = createRootRoute({
    component: () => (
      <ReferenceContext value={{ tripId: 'long-trip-id' }}>
        <CanonicalLink params={{ tripId: 'abcdef' }} to="/trips/$tripId">
          Canonical trip
        </CanonicalLink>
      </ReferenceContext>
    )
  });
  const trip = createRoute({ getParentRoute: () => root, path: '/trips/$tripId' });
  const router = createRouter({
    routeTree: root.addChildren([trip]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  });

  render(<RouterProvider router={router} />);

  expect((await screen.findByRole('link', { name: 'Canonical trip' })).getAttribute('href')).toBe(
    '/trips/abcdef'
  );
  expect(mocks.useQueries).not.toHaveBeenCalled();
});
