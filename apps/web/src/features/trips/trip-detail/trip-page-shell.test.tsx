import Shell from '@groam/ui/components/shell/client';
import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { itineraryTrip } from '@/features/trips/testing/itinerary-editor-fixtures';
import { StatefulItineraryEditor } from '@/features/trips/testing/itinerary-editor-harness';
import { ChangeSummary } from '@/features/trips/trip-versions/change-summary';
import { TripInlineNotice } from './trip-inline-notice';
import { TripPageShell } from './trip-page-shell';

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

type Tab = 'compare' | 'itinerary' | 'overview';

function TwoColumnBody({ children }: { children?: ReactNode }) {
  return (
    <Shell.TwoColumns>
      <Shell.LeftColumn>{children ?? <p>Main column</p>}</Shell.LeftColumn>
      <Shell.RightColumn>
        <p>Supporting column</p>
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
}

const bodies = {
  compare: () => (
    <TwoColumnBody>
      <ChangeSummary
        changes={[
          {
            change: 'added',
            entity: 'activity',
            fields: [],
            key: 'museum',
            label: 'Museum visit'
          }
        ]}
        status="draft"
      />
    </TwoColumnBody>
  ),
  itinerary: () => (
    <StatefulItineraryEditor
      initial={itineraryTrip([{ endDay: 3, name: 'Porto', startDay: 1 }])}
      standalone={false}
    />
  ),
  overview: () => <TwoColumnBody />
} satisfies Record<Tab, () => ReactNode>;

/** The trip page as the workspace shell frames it, showing the body of one tab. */
function TripPage({ tab }: { tab: Tab }) {
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TripPageShell body={bodies[tab]()} header={<h1>Coast week</h1>} />
      </div>
    </SidebarProvider>
  );
}

function required<Element extends HTMLElement>(selector: string, root: ParentNode = document) {
  const element = root.querySelector<Element>(selector);
  if (!element) throw new Error(`Expected ${selector}`);
  return element;
}

/** Let the browser resolve semantic tokens and keywords the way it paints them. */
function resolvedBackground(value: string) {
  const probe = document.body.appendChild(document.createElement('span'));
  probe.style.backgroundColor = value;
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return resolved;
}

/** The painted canvas behind the page body, looking through transparent wrappers. */
function pageCanvas() {
  const body = required('[data-slot="trip-page-body"]');
  const clear = resolvedBackground('transparent');
  let canvas: Element | null = body;
  while (canvas && getComputedStyle(canvas).backgroundColor === clear)
    canvas = canvas.parentElement;
  const frame = body.getBoundingClientRect();
  return {
    background: canvas ? getComputedStyle(canvas).backgroundColor : clear,
    overflow: body.scrollWidth > body.clientWidth,
    padding: getComputedStyle(body).padding,
    width: Math.round(frame.width)
  };
}

function twoColumnLayout() {
  const body = required('[data-slot="trip-page-body"]');
  const grid = required('[data-slot="shell-two-columns"]', body);
  const frame = body.getBoundingClientRect();
  const primary = required('[data-slot="shell-left-column"]', grid).getBoundingClientRect();
  const secondary = required('[data-slot="shell-right-column"]', grid).getBoundingClientRect();
  return {
    columns: getComputedStyle(grid).gridTemplateColumns,
    gap: getComputedStyle(grid).gap,
    leftInset: Math.round(primary.left - frame.left),
    padding: getComputedStyle(body).padding,
    rightWidth: Math.round(secondary.width),
    stacked: secondary.top >= primary.bottom,
    topInset: Math.round(primary.top - frame.top)
  };
}

const pageOverflows = () =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth;

beforeEach(() => {
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('supporting column', () => {
  // Trip pages size the supporting column from the trip workspace container (18rem = 288px).
  test.each([
    [1440, false],
    [1024, false],
    [1023, true],
    [390, true]
  ])('at %ipx wide the column stacked is %s', async (width, stacked) => {
    await useViewport(width, 1000);
    await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const layout = twoColumnLayout();
    expect(layout.stacked).toBe(stacked);
    if (!stacked) expect(layout.rightWidth).toBe(288);
    expect(pageCanvas().overflow).toBe(false);
    expect(pageOverflows()).toBe(false);
  });

  test.each([1440, 1024, 390])(
    'the comparison tab lays out exactly like the overview at %ipx',
    async (width) => {
      await useViewport(width, 1000);
      const view = await render(<TripPage tab="overview" />);
      await expect.element(page.getByText('Supporting column')).toBeVisible();
      const overview = { canvas: pageCanvas(), layout: twoColumnLayout() };
      await view.rerender(<TripPage tab="compare" />);
      await expect.element(page.getByText('Museum visit')).toBeVisible();
      expect({ canvas: pageCanvas(), layout: twoColumnLayout() }).toEqual(overview);
    }
  );
});

describe('itinerary tab', () => {
  test.each([1440, 1024, 390])(
    'uses the full body width without a supporting column at %ipx',
    async (width) => {
      await useViewport(width, 1000);
      await render(<TripPage tab="itinerary" />);
      await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
      await expect.element(page.getByText('Supporting column')).not.toBeInTheDocument();
      const body = required('[data-slot="trip-page-body"]');
      const style = getComputedStyle(body);
      const available = Math.round(
        body.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight)
      );
      const section = page.getByRole('region', { name: 'Itinerary editor' }).element();
      expect(Math.round(section.getBoundingClientRect().width)).toBe(available);
      expect(pageOverflows()).toBe(false);
    }
  );

  test('shares the overview canvas', async () => {
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const overview = pageCanvas();
    await view.rerender(<TripPage tab="itinerary" />);
    await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
  });
});

describe('page canvas', () => {
  test.each([
    ['light', false, 1440],
    ['light', false, 390],
    ['dark', true, 1440],
    ['dark', true, 390]
  ])('every tab paints the canvas token in %s mode at %ipx', async (_mode, dark, width) => {
    document.documentElement.classList.toggle('dark', dark);
    await useViewport(width, 1000);
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const overview = pageCanvas();
    expect(overview.overflow).toBe(false);
    expect(overview.background).toBe(resolvedBackground('var(--canvas)'));
    // The workspace wrapper stays transparent so the canvas shows through.
    expect(getComputedStyle(required('[data-slot="sidebar-wrapper"]')).backgroundColor).toBe(
      resolvedBackground('transparent')
    );

    await view.rerender(<TripPage tab="itinerary" />);
    await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
    await view.rerender(<TripPage tab="compare" />);
    await expect.element(page.getByText('Museum visit')).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
  });

  test('the dark canvas differs from the light canvas', async () => {
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const light = pageCanvas().background;
    document.documentElement.classList.add('dark');
    await view.rerender(<TripPage tab="overview" />);
    expect(pageCanvas().background).not.toBe(light);
  });
});

describe('floating notices', () => {
  function LongPage() {
    return (
      <SidebarProvider className="h-svh min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TripPageShell
            banner={<TripInlineNotice title="The shared trip has changed" />}
            body={
              <div>
                <div style={{ height: 2400 }} />
                <p>Last line</p>
              </div>
            }
            header={<h1>Coast week</h1>}
          />
        </div>
      </SidebarProvider>
    );
  }

  test('float as a card, also at the end of the page', async () => {
    await useViewport(1440, 800);
    await render(<LongPage />);
    const notice = page.getByRole('region', { name: 'The shared trip has changed' });
    await expect.element(notice).toBeVisible();
    const scroller = required('[data-slot="shell-content"]');
    const card = notice.element();
    const viewportBottom = scroller.getBoundingClientRect().bottom;
    const width = card.getBoundingClientRect().width;

    expect(width).toBeLessThan(scroller.clientWidth);
    expect(card.getBoundingClientRect().bottom).toBeLessThan(viewportBottom);

    scroller.scrollTop = scroller.scrollHeight;
    await expect
      .poll(() => page.getByText('Last line').element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(card.getBoundingClientRect().top);
    expect(card.getBoundingClientRect().width).toBe(width);
    expect(card.getBoundingClientRect().bottom).toBeLessThan(viewportBottom);
  });
});
