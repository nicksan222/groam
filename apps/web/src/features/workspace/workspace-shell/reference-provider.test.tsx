import { render } from '@groam/vitest-config/react';
import { use } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  ReferenceContext,
  ReferenceStatusContext
} from '@/features/workspace/hooks/reference-context';
import { ReferenceProvider } from './reference-provider';

const state = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  pathname: '/trips/long-id',
  resolved: { ids: {}, loading: false, missing: false, shortIds: {} } as {
    ids: Record<string, string>;
    loading: boolean;
    missing: boolean;
    shortIds: Record<string, string>;
  }
}));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => navigate,
  useParams: () => state.params
}));
vi.mock('@/features/workspace/hooks/use-reference-params', () => ({
  useReferenceParams: () => state.resolved
}));
vi.mock('@/features/workspace/hooks/reference-params', () => ({
  referenceEntries: (params: Record<string, string>) =>
    Object.entries(params).map(([key, reference]) => ({ key, reference, table: 'trips' }))
}));

function Probe() {
  const ids = use(ReferenceContext);
  const status = use(ReferenceStatusContext);
  return (
    <p>
      ids={JSON.stringify(ids)} loading={String(status.loading)} missing={String(status.missing)}
    </p>
  );
}

beforeEach(() => {
  navigate.mockClear();
  state.params = { tripId: 'long-id' };
  state.pathname = '/trips/long-id';
  state.resolved = {
    ids: { tripId: 'long-id' },
    loading: false,
    missing: false,
    shortIds: { tripId: 'abc' }
  };
});

describe('ReferenceProvider', () => {
  test('provides resolved ids and status to descendants', async () => {
    await render(
      <ReferenceProvider>
        <Probe />
      </ReferenceProvider>
    );
    await expect
      .element(page.getByText('ids={"tripId":"long-id"} loading=false missing=false'))
      .toBeVisible();
  });

  test('replaces the URL with the short reference once resolved', async () => {
    await render(<ReferenceProvider>content</ReferenceProvider>);
    await expect
      .poll(() => navigate.mock.calls)
      .toEqual([[{ hash: true, replace: true, search: true, to: '/trips/abc' }]]);
  });

  test.each([
    ['still loading', { loading: true, missing: false }],
    ['missing', { loading: false, missing: true }]
  ])('does not rewrite the URL while %s', async (_, flags) => {
    state.resolved = { ...state.resolved, ...flags };
    await render(<ReferenceProvider>content</ReferenceProvider>);
    await expect.element(page.getByText('content')).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('does not navigate when the URL is already canonical', async () => {
    state.pathname = '/trips/abc';
    await render(<ReferenceProvider>content</ReferenceProvider>);
    await expect.element(page.getByText('content')).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('exposes loading and missing flags', async () => {
    state.resolved = { ids: {}, loading: false, missing: true, shortIds: {} };
    await render(
      <ReferenceProvider>
        <Probe />
      </ReferenceProvider>
    );
    await expect.element(page.getByText(/missing=true/)).toBeVisible();
  });
});
