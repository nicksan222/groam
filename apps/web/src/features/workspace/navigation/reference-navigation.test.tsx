import { render } from '@groam/vitest-config/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ReferenceContext, useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { CanonicalLink, Link } from '@/features/workspace/navigation/reference-link';
import { ReferenceContent } from '@/features/workspace/workspace-shell/reference-content';
import { ReferenceProvider } from '@/features/workspace/workspace-shell/reference-provider';

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

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQueries: mocks.useQueries
}));

async function mount(path: string) {
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
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- inline route component in a test router
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
  await render(<RouterProvider router={router} />);
  return router;
}

test('loads a short URL using the internal ID and renders short links', async () => {
  await mount('/trips/abcdef');
  await expect.element(page.getByText('Record: long-trip-id')).toBeInTheDocument();
  await expect
    .element(page.getByRole('link', { name: 'Overview' }))
    .toHaveAttribute('href', '/trips/abcdef/overview');
});

test('canonicalizes an existing long link without losing search or hash', async () => {
  const router = await mount('/trips/long-trip-id?focus=map#details');
  await expect.element(page.getByText('Record: long-trip-id')).toBeInTheDocument();
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/trips/abcdef'));
  expect(router.state.location.searchStr).toContain('focus=map');
  expect(router.state.location.hash).toBe('details');
});

test('does not render a record when its short reference is unavailable', async () => {
  await mount('/trips/zzzzzz');
  await expect
    .element(page.getByText('This page was not found or is unavailable to you.'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Record: long-trip-id')).not.toBeInTheDocument();
});

test('keeps workspace navigation mounted while an idea reference loads', async () => {
  await mount('/trips/pending');
  await expect.element(page.getByRole('status', { name: 'Opening page…' })).toBeInTheDocument();
  await expect
    .element(page.getByRole('complementary', { name: 'Workspace navigation' }))
    .toBeInTheDocument();
  await expect.element(page.getByText('Record: pending')).not.toBeInTheDocument();
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

  await render(<RouterProvider router={router} />);

  await expect
    .element(page.getByRole('link', { name: 'Canonical trip' }))
    .toHaveAttribute('href', '/trips/abcdef');
  expect(mocks.useQueries).not.toHaveBeenCalled();
});

test('keeps the rendered page mounted when moving between known references', async () => {
  const defaults = mocks.useQueries.getMockImplementation();
  const root = createRootRoute({
    component: () => (
      <ReferenceProvider>
        <ReferenceContent>
          <Outlet />
        </ReferenceContent>
      </ReferenceProvider>
    )
  });
  const trip = createRoute({
    getParentRoute: () => root,
    path: '/trips/$tripId',
    component: () => <h1 data-testid="trip-header">Trip header</h1>
  });
  const router = createRouter({
    routeTree: root.addChildren([trip]),
    history: createMemoryHistory({ initialEntries: ['/trips/long-trip-id'] })
  });
  await render(<RouterProvider router={router} />);
  const header = page.getByTestId('trip-header');
  await expect.element(header).toBeInTheDocument();
  const node = header.element();
  // The short form is known from the long-id result, so it must not need a fresh round trip.
  mocks.useQueries.mockImplementation((queries: Record<string, { args: { reference: string } }>) =>
    Object.fromEntries(
      Object.entries(queries).map(([key, { args }]) => [
        key,
        args.reference === 'long-trip-id' ? { id: 'long-trip-id', shortId: 'abcdef' } : undefined
      ])
    )
  );
  await router.navigate({ to: '/trips/$tripId', params: { tripId: 'abcdef' } });
  await expect.element(page.getByTestId('trip-header')).toBeInTheDocument();
  expect(page.getByTestId('trip-header').element()).toBe(node);
  expect(page.getByRole('status', { name: 'Opening page…' }).query()).toBeNull();
  if (defaults) mocks.useQueries.mockImplementation(defaults);
});
