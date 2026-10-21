import { render } from '@groam/vitest-config/react';
import { ParamsContext, RouterContext } from '@void/react';
import { type PropsWithChildren, useMemo, useSyncExternalStore } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ReferenceContext, useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { CanonicalLink, Link } from '@/features/workspace/navigation/router';
import { ReferenceContent } from '@/features/workspace/workspace-shell/reference-content';
import { ReferenceProvider } from '@/features/workspace/workspace-shell/reference-provider';
import { useParams } from '@/lib/navigation/router';

beforeEach(() => {
  mocks.useQueries.mockClear();
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

/** A minimal Void router whose location can be read and visited from the test. */
function createFakeRouter(path: string) {
  let url = new URL(path, 'http://localhost');
  const listeners = new Set<() => void>();
  const visit = vi.fn(async (next: string | URL) => {
    url = new URL(next, url);
    for (const listener of listeners) listener();
  });
  return {
    get url() {
      return url;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    visit
  };
}

type FakeRouter = ReturnType<typeof createFakeRouter>;

function FakeVoidPage({ children, fake }: PropsWithChildren<{ fake: FakeRouter }>) {
  const url = useSyncExternalStore(fake.subscribe, () => fake.url);
  const params = useMemo(
    () => ({ tripId: /^\/trips\/([^/]+)/u.exec(url.pathname)?.[1] ?? '' }),
    [url.pathname]
  );
  const router = useMemo(
    () => ({
      _hoverDelay: 0,
      flush: vi.fn(),
      flushAll: vi.fn(),
      params,
      path: url.pathname,
      prefetch: vi.fn(async () => undefined),
      query: url.searchParams,
      refresh: vi.fn(async () => undefined),
      url,
      visit: fake.visit
    }),
    [fake.visit, params, url]
  );
  return (
    <RouterContext value={router}>
      <ParamsContext value={params}>{children}</ParamsContext>
    </RouterContext>
  );
}

function TripPage() {
  const { tripId = '' } = useResolvedParams(useParams<{ tripId: string }>());
  return (
    <>
      <span>Record: {tripId}</span>
      <Link params={{ tripId, section: 'overview' }} to="/trips/$tripId/$section">
        Overview
      </Link>
    </>
  );
}

async function mount(path: string) {
  const fake = createFakeRouter(path);
  await render(
    <FakeVoidPage fake={fake}>
      <ReferenceProvider>
        <aside aria-label="Workspace navigation">Your workspace</aside>
        <ReferenceContent>
          <TripPage />
        </ReferenceContent>
      </ReferenceProvider>
    </FakeVoidPage>
  );
  return fake;
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
  await vi.waitFor(() => expect(router.url.pathname).toBe('/trips/abcdef'));
  expect(router.url.search).toContain('focus=map');
  expect(router.url.hash).toBe('#details');
  expect(router.visit).toHaveBeenCalledWith(expect.any(String), {
    replace: true,
    viewTransition: false
  });
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
  await render(
    <FakeVoidPage fake={createFakeRouter('/')}>
      <ReferenceContext value={{ tripId: 'long-trip-id' }}>
        <CanonicalLink params={{ tripId: 'abcdef' }} to="/trips/$tripId">
          Canonical trip
        </CanonicalLink>
      </ReferenceContext>
    </FakeVoidPage>
  );

  await expect
    .element(page.getByRole('link', { name: 'Canonical trip' }))
    .toHaveAttribute('href', '/trips/abcdef');
  expect(mocks.useQueries).not.toHaveBeenCalled();
});

test('keeps the rendered page mounted when moving between known references', async () => {
  const defaults = mocks.useQueries.getMockImplementation();
  const fake = createFakeRouter('/trips/long-trip-id');
  await render(
    <FakeVoidPage fake={fake}>
      <ReferenceProvider>
        <ReferenceContent>
          <h1 data-testid="trip-header">Trip header</h1>
        </ReferenceContent>
      </ReferenceProvider>
    </FakeVoidPage>
  );
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
  await fake.visit('/trips/abcdef');
  await expect.element(page.getByTestId('trip-header')).toBeInTheDocument();
  expect(page.getByTestId('trip-header').element()).toBe(node);
  expect(page.getByRole('status', { name: 'Opening page…' }).query()).toBeNull();
  if (defaults) mocks.useQueries.mockImplementation(defaults);
});
