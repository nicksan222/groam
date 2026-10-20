import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { testIds } from '@/lib/test-ids';
import { IdeaListRow } from './idea-list-row';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => (
    <a
      {...rest}
      href={Object.entries(params).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to
      )}
    >
      {children}
    </a>
  )
}));

function makeIdea(overrides: Partial<WorkspaceIdea> = {}): WorkspaceIdea {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    id: 'idea-1' as Id<'tripProposals'>,
    ideaName: 'Coast day',
    reviewRequested: false,
    sourceTripId: 'trip-1' as Id<'trips'>,
    sourceTripName: 'Atlantic week',
    status: 'in_review',
    title: 'Add a coast day',
    updatedAt: Date.UTC(2026, 7, 17, 12),
    workingTripId: 'trip-2' as Id<'trips'>,
    ...overrides
  } as WorkspaceIdea;
}

function renderTable(
  data: WorkspaceIdea[],
  options: {
    onOpen?: (idea: WorkspaceIdea) => void;
    showTripName?: boolean;
    viewer?: string | null;
  }
) {
  return render(
    <>
      {data.map((proposal) => (
        <IdeaListRow
          key={proposal.id}
          onActivate={() => options.onOpen?.(proposal)}
          proposal={proposal}
          showTripName={options.showTripName ?? false}
          viewerUserId={options.viewer}
        />
      ))}
    </>
  );
}

describe('IdeaListRow', () => {
  test('renders title, trip, author, status, and formatted date', async () => {
    await renderTable([makeIdea()], { showTripName: true, viewer: 'user-sam' });
    await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
    await expect.element(page.getByText('Atlantic week').first()).toBeInTheDocument();
    await expect.element(page.getByText('Alex Morgan')).toBeInTheDocument();
    await expect.element(page.getByText('In review')).toBeInTheDocument();
    await expect.element(page.getByText(/updated Aug 17, 2026/u)).toBeInTheDocument();
    for (const label of ['Atlantic week', 'Alex Morgan', 'updated Aug 17, 2026']) {
      const chip = page.getByText(label, { exact: true }).element().closest('[data-slot="badge"]');
      expect(chip).not.toBeNull();
      expect(chip?.querySelector('svg')).not.toBeNull();
    }
  });

  test('puts authorship and trip below a linked title and calls out requested reviews', async () => {
    await renderTable([makeIdea({ reviewRequested: true })], {
      showTripName: true,
      viewer: 'user-sam'
    });
    await expect
      .element(page.getByRole('link', { name: 'Add a coast day' }))
      .toHaveAttribute('href', '/trips/trip-1/ideas/idea-1/compare');
    await expect.element(page.getByText(/started by Alex Morgan/u)).toBeVisible();
    await expect.element(page.getByText('Review requested')).toBeVisible();
    await expect.element(page.getByText('Atlantic week', { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole('columnheader', { name: 'Started by' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('columnheader', { name: 'Trip' })).not.toBeInTheDocument();
  });

  test('keeps review notices off the title line and hides internal idea names', async () => {
    await renderTable([makeIdea({ reviewRequested: true })], {
      showTripName: true,
      viewer: 'user-sam'
    });
    const title = page
      .getByRole('heading', { name: 'Add a coast day' })
      .element()
      .getBoundingClientRect();
    const notice = page
      .getByText('Review requested', { exact: true })
      .element()
      .getBoundingClientRect();
    expect(notice.top).toBeGreaterThanOrEqual(title.bottom);
    await expect.element(page.getByText('#Coast day')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('columnheader', { name: 'Status', exact: true }))
      .not.toBeInTheDocument();
  });

  test('viewer draft names your draft and provides a Continue button that opens the idea', async () => {
    const onOpen = vi.fn();
    const draft = makeIdea({ status: 'draft' });
    await renderTable([draft], { onOpen, viewer: 'user-alex' });
    await expect.element(page.getByText('Your draft')).toBeInTheDocument();
    await page.getByTestId(testIds.ideaContinue).click({ force: true });
    expect(onOpen).toHaveBeenCalledWith(draft);
    await expect.element(page.getByTestId(testIds.ideaView)).not.toBeInTheDocument();
  });

  test.each<[string, Partial<WorkspaceIdea>, string | null, string]>([
    ['someone else’s draft', { status: 'draft' }, 'user-sam', 'Draft'],
    ['an in-review idea by the viewer', {}, 'user-alex', 'In review']
  ])('%s shows its state and an Open link', async (_, overrides, viewer, label) => {
    await renderTable([makeIdea(overrides)], { viewer });
    await expect.element(page.getByText(label, { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText('Your draft')).not.toBeInTheDocument();
    await expect
      .element(page.getByTestId(testIds.ideaView))
      .toHaveAttribute('href', '/trips/trip-1/ideas/idea-1/compare');
    await expect.element(page.getByTestId(testIds.ideaContinue)).not.toBeInTheDocument();
  });
});

test('gives phone context its own line above the state and review footer', async () => {
  await useViewport(390, 844);
  await renderTable([makeIdea({ reviewRequested: true })], { showTripName: true });
  const row = page.getByRole('article').element();
  const description = row.querySelector('[data-slot="record-list-description"]');
  const state = page.getByText('In review', { exact: true }).element();
  expect(description?.textContent).toContain('Atlantic week');
  expect(description?.textContent).toContain('started by Alex Morgan');
  expect(state.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    description!.getBoundingClientRect().bottom
  );
  expect(page.getByText('Alex Morgan', { exact: true }).elements()).toHaveLength(1);
  await expect.element(page.getByText('Review requested')).toBeVisible();
});

test.each([390, 1280])('wraps the complete idea title above its chips at %ipx', async (width) => {
  await useViewport(width, 844);
  const title =
    'Add a coastal day with accessible transport and a rainy-day alternative for the group. '.repeat(
      4
    );
  await renderTable([makeIdea({ title, reviewRequested: true })], { showTripName: true });
  const row = page.getByRole('article').element();
  const heading = page.getByRole('heading', { name: title.trim() }).element();
  const titleArea = row.querySelector('[data-slot="record-list-title"]')!;
  const context = row.querySelector('[data-slot="record-list-context"]')!;
  expect(heading.getBoundingClientRect().height).toBeGreaterThan(24);
  expect(titleArea.scrollHeight).toBeLessThanOrEqual(titleArea.clientHeight);
  expect(context.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    titleArea.getBoundingClientRect().bottom
  );
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
  if (width === 1280) {
    const status = page.getByText('In review', { exact: true }).element().getBoundingClientRect();
    const action = page.getByTestId(testIds.ideaView).element().getBoundingClientRect();
    expect(
      Math.abs(status.top + status.height / 2 - action.top - action.height / 2)
    ).toBeLessThanOrEqual(1);
  }
});
