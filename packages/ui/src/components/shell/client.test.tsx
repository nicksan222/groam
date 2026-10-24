import { MoreHorizontal, Plus, Route } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  SHELL_BLEED_INSET,
  SHELL_HEADER_BODY_GAP,
  SHELL_PAGE_BOTTOM,
  SHELL_PAGE_BOTTOM_NAV,
  SHELL_PAGE_MAX_WIDTH,
  SHELL_HEADER_PADDING,
  SHELL_HEADER_ROW_PX,
  SHELL_PAGE_INSET,
  SHELL_TITLE,
  SHELL_TRIP_SWITCHER_CENTER_PX
} from '#src/lib/shell-layout';
import Shell from './client';

test('applies shared shell padding tokens to header and page body', async () => {
  await render(
    <Shell>
      <Shell.Header data-testid="shell-header" meta="Facts" title="Trips" />
      <Shell.Content>
        <Shell.PageBody data-testid="page-body">Trip content</Shell.PageBody>
      </Shell.Content>
    </Shell>
  );

  const header = page.getByTestId('shell-header').element();
  const padded = header.firstElementChild as HTMLElement;
  const body = page.getByTestId('page-body').element();

  for (const token of SHELL_PAGE_INSET.split(' ')) {
    expect(padded.className).toContain(token);
    expect(body.className).toContain(token);
  }
  for (const token of SHELL_HEADER_PADDING.split(' ')) {
    expect(padded.className).toContain(token);
  }
  expect(SHELL_HEADER_PADDING).toContain(SHELL_HEADER_BODY_GAP);
  for (const token of SHELL_TITLE.split(' ')) {
    await expect.element(page.getByRole('heading', { level: 1, name: 'Trips' })).toHaveClass(token);
  }
});

test('a padded page body owns inset, width, rhythm and bottom, never top padding', async () => {
  await render(
    <Shell>
      <Shell.PageBody data-testid="padded">A</Shell.PageBody>
      <Shell.PageBody clearNav data-testid="nav">
        B
      </Shell.PageBody>
    </Shell>
  );
  const padded = page.getByTestId('padded').element();
  for (const token of [...SHELL_PAGE_MAX_WIDTH.split(' '), ...SHELL_PAGE_BOTTOM.split(' ')]) {
    expect(padded.className).toContain(token);
  }
  expect(padded.className).toContain('pt-0');
  expect(padded.className).toContain('space-y-6');
  // It grows to the pane's height, so a `List fill` footer rests at the bottom of a short page.
  expect(padded.className).toContain('flex-1');
  expect(padded.className).toContain('flex-col');
  expect(padded.getAttribute('data-layout')).toBe('padded');
  for (const token of SHELL_PAGE_BOTTOM_NAV.split(' ')) {
    expect(page.getByTestId('nav').element().className).toContain(token);
  }
});

test('a bleed page body has no inset or width cap; its content uses the bleed inset', async () => {
  await render(
    <Shell>
      <Shell.PageBody data-testid="bleed" layout="bleed">
        A
      </Shell.PageBody>
    </Shell>
  );
  const bleed = page.getByTestId('bleed').element();
  expect(bleed.getAttribute('data-layout')).toBe('bleed');
  expect(bleed.className).not.toMatch(/(?:^|\s)(?:px-|max-w-|mx-auto|pb-|space-y)/u);
  expect(SHELL_BLEED_INSET).toBe(SHELL_PAGE_INSET);
});

test('the gap to the body is 16px on phones, 24px from md, and applied once', async () => {
  expect(SHELL_HEADER_BODY_GAP).toBe('pb-4 md:pb-6');
  await render(<Shell.Header data-testid="shell-header" meta="Facts" title="Plan" />);
  const header = page.getByTestId('shell-header').element();
  const meta = header.querySelector('[data-slot="shell-header-meta"]');
  expect(meta?.className).not.toMatch(/\bpb-/u);
  expect((header.firstElementChild as HTMLElement).className).toContain('pb-4');
});

test('the header has no rule and no background of its own', async () => {
  await render(<Shell.Header data-testid="shell-header" meta="Facts" title="Plan" />);
  const header = page.getByTestId('shell-header').element();
  expect(header.outerHTML).not.toMatch(/border-b|bg-background|bg-muted|sticky/u);
  expect(getComputedStyle(header).borderBottomWidth).toBe('0px');
});

test('the title row is centred on the sidebar trip switcher', async () => {
  expect(SHELL_TRIP_SWITCHER_CENTER_PX).toBe(36.75);
  expect(SHELL_HEADER_ROW_PX).toBe(SHELL_TRIP_SWITCHER_CENTER_PX * 2);
  await render(<Shell.Header data-testid="shell-header" title="Plan" />);
  const row = page.getByTestId('shell-header').element().firstElementChild?.firstElementChild;
  expect(row?.className).toContain('md:h-(--shell-header-row)');
  expect(
    getComputedStyle(page.getByTestId('shell-header').element()).getPropertyValue(
      '--shell-header-row'
    )
  ).toBe(`${SHELL_HEADER_ROW_PX}px`);
});

test('lays out parent, title, status, actions and meta, and forwards title data attributes', async () => {
  await render(
    <Shell.Header
      actions={<button type="button">Go</button>}
      meta="Opened by Ada"
      parent={<a href="/issues">Issues</a>}
      status={<span>Draft</span>}
      title="Alpine Escape"
      titleProps={{ 'data-testid': 'trip-heading', 'data-trip-name': 'Alpine Escape' }}
    />
  );
  const heading = page.getByTestId('trip-heading').element();
  expect(heading.getAttribute('data-trip-name')).toBe('Alpine Escape');
  expect(heading.tagName).toBe('H1');
  await expect.element(page.getByRole('link', { name: 'Issues' })).toBeInTheDocument();
  expect(document.querySelector('[data-slot="shell-header-back"]')).not.toBeNull();
  await expect.element(page.getByText('Draft')).toBeInTheDocument();
  await expect.element(page.getByText('Opened by Ada')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Go' })).toBeInTheDocument();
});

test('a lead control is set off from the actions by a divider', async () => {
  await render(
    <Shell.Header
      actions={<button type="button">Go</button>}
      lead={<span>30 going</span>}
      title="Plan"
    />
  );
  expect(document.querySelector('[data-slot="shell-header-divider"]')).not.toBeNull();
});

test('content scrolls vertically without overflow-x-clip locking the y axis', async () => {
  await render(
    <Shell>
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  await expect.element(page.getByText('Trip content')).toBeInTheDocument();
  const content = page.getByText('Trip content').element();
  expect(content.getAttribute('data-slot')).toBe('shell-content');
  expect(content.className).toContain('overflow-y-auto');
  expect(content.className).toContain('overflow-x-hidden');
  expect(content.className).toContain('min-h-0');
  expect(content.className).not.toMatch(/(?:^|\s)(?:px-|pb-|pt-|gap-)/u);
  expect(content.className).not.toContain('overflow-x-clip');
  const shell = content.parentElement?.parentElement;
  expect(shell?.className).toContain('overflow-hidden');
  expect(shell?.className).not.toContain('overflow-x-clip');
});

test('renders banner page layout with a padded body', async () => {
  await render(
    <Shell>
      <Shell.BannerLayout>
        <Shell.Header title="Lisbon weekend" />
        <Shell.PageBody data-testid="trip-body">Overview content</Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );

  const body = page.getByTestId('trip-body').element();
  expect(body.getAttribute('data-slot')).toBe('shell-page-body');
  expect(body.className).toContain('px-4');
  expect(body.className).toContain('pt-0');
  expect(getComputedStyle(body).paddingBottom).toBe('32px');
  expect(body.className).toContain('max-w-[1600px]');
});

test('renders section header with badge and trailing content', async () => {
  await render(
    <Shell.SectionHeader
      badge="1 stop"
      density="compact"
      description="2 activities currently planned across the route."
      icon={Route}
      title="Route"
      trailing={<span>Add stop</span>}
    />
  );

  await expect.element(page.getByRole('heading', { name: 'Route' })).toBeInTheDocument();
  await expect.element(page.getByText('1 stop')).toBeInTheDocument();
  await expect
    .element(page.getByText('2 activities currently planned across the route.'))
    .toBeInTheDocument();
});

test('renders section header skeletons while loading', async () => {
  const { container } = await render(<Shell.SectionHeader density="compact" isLoading />);

  await expect.element(page.getByRole('heading')).not.toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(1);
});

test('renders section stacks with reveal rhythm', async () => {
  await render(
    <Shell.Section data-testid="compact-section" stack="sm">
      Section content
    </Shell.Section>
  );

  const section = page.getByTestId('compact-section').element();
  expect(section.className).toContain('dashboard-reveal');
  expect(section.className).toContain('space-y-3');
});

test('renders reveal wrapper for flush content blocks', async () => {
  await render(
    <Shell.Reveal data-testid="results">
      <span>Table body</span>
    </Shell.Reveal>
  );

  const reveal = page.getByTestId('results').element();
  expect(reveal.getAttribute('data-slot')).toBe('shell-reveal');
  expect(reveal.className).toContain('dashboard-reveal');
});

test('registers layout primitives on the shell root', async () => {
  expect(typeof Shell.Card).toBe('function');
  expect(typeof Shell.CardBody).toBe('function');
  expect(typeof Shell.CardFooter).toBe('function');
  expect(typeof Shell.CardHeader).toBe('function');
  expect(typeof Shell.Eyebrow).toBe('function');
  expect(typeof Shell.Reveal).toBe('function');
  expect(typeof Shell.Stack).toBe('function');
  expect(typeof Shell.UnderlineNav).toBe('function');
});

test('renders stack densities', async () => {
  await render(
    <Shell.Stack data-testid="page-stack" stack="page">
      Content
    </Shell.Stack>
  );

  await expect.element(page.getByTestId('page-stack')).toHaveClass('space-y-6');
});

test('renders underline nav chrome around tabs', async () => {
  await render(
    <Shell.UnderlineNav aria-label="Trip sections" data-testid="section-nav">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
    </Shell.UnderlineNav>
  );

  const nav = page.getByTestId('section-nav').element();
  expect(nav.tagName).toBe('NAV');
  expect(nav.className).toContain('border-b');
  await expect.element(page.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
});

test('renders card variants with standardized tokens', async () => {
  await render(
    <>
      <Shell.Card data-testid="panel-card" variant="panel">
        Panel
      </Shell.Card>
      <Shell.Card data-testid="filled-card" variant="filled">
        Filled
      </Shell.Card>
      <Shell.Card data-testid="dashed-card" variant="dashed">
        Dashed
      </Shell.Card>
      <Shell.Card data-testid="callout-card" variant="callout">
        Callout
      </Shell.Card>
      <Shell.Card data-testid="chrome-card" padding="none" variant="filled">
        <Shell.CardHeader>Header</Shell.CardHeader>
        <Shell.CardBody>Body</Shell.CardBody>
        <Shell.CardFooter>Footer</Shell.CardFooter>
      </Shell.Card>
      <Shell.Eyebrow data-testid="eyebrow" tone="primary">
        Next
      </Shell.Eyebrow>
    </>
  );

  await expect.element(page.getByTestId('panel-card')).toHaveAttribute('data-variant', 'panel');
  await expect.element(page.getByTestId('panel-card')).toHaveClass('dashboard-panel');
  await expect.element(page.getByTestId('panel-card')).toHaveClass('dashboard-reveal');
  await expect.element(page.getByTestId('filled-card')).toHaveClass('dashboard-panel');
  await expect.element(page.getByTestId('dashed-card')).toHaveClass('border-dashed');
  await expect.element(page.getByTestId('callout-card')).toHaveClass('rounded-lg');
  await expect.element(page.getByTestId('callout-card')).toHaveClass('border-border');
  expect(
    page.getByTestId('chrome-card').element().querySelector('[data-slot="shell-card-header"]')
  ).toBeTruthy();
  expect(
    page.getByTestId('chrome-card').element().querySelector('[data-slot="shell-card-body"]')
  ).toBeTruthy();
  expect(
    page.getByTestId('chrome-card').element().querySelector('[data-slot="shell-card-footer"]')
  ).toBeTruthy();
  await expect.element(page.getByTestId('eyebrow')).toHaveAttribute('data-tone', 'primary');
});

test('renders property grid rows', async () => {
  await render(
    <Shell.PropertyGrid
      aria-label="Trip facts"
      items={[
        { label: 'Window', value: 'Flexible' },
        { label: 'Stops', numeric: true, value: '1' }
      ]}
    />
  );

  expect(page.getByLabelText('Trip facts').element().tagName).toBe('DL');
  await expect.element(page.getByText('Window')).toBeInTheDocument();
  await expect.element(page.getByText('Stops')).toBeInTheDocument();
});

test('applies page inset to top underline tabs by default', async () => {
  await render(
    <Shell.TabContainer data-testid="banner-tabs" position="top" variant="underline">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
    </Shell.TabContainer>
  );

  await expect.element(page.getByTestId('banner-tabs')).toHaveClass('px-4');
});

test('marks the active underline tab as the current page', async () => {
  await render(
    <Shell.TabContainer position="top" variant="underline">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
      <Shell.Tab onClick={() => undefined} position="top" title="People (3)" />
    </Shell.TabContainer>
  );

  const overview = page.getByRole('button', { name: 'Overview' }).element();
  const people = page.getByRole('button', { name: 'People (3)' }).element();
  expect(overview.getAttribute('aria-current')).toBe('page');
  expect(people.hasAttribute('aria-current')).toBe(false);
});

test('constrains long sidebar headers instead of widening the workspace', async () => {
  await render(
    <Shell>
      <Shell.Header title="Trip overview" />
      <Shell.TabContainer
        data-testid="trip-sidebar"
        header={
          <div data-testid="long-sidebar-header">
            A trip name that is intentionally far too long for the fixed-width sidebar
          </div>
        }
        position="sidebar"
        width={248}
      >
        <Shell.Tab title="Overview" />
      </Shell.TabContainer>
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  await expect.element(page.getByTestId('trip-sidebar')).toBeInTheDocument();
  await expect.element(page.getByTestId('trip-sidebar')).toHaveClass('overflow-hidden');
  expect(page.getByTestId('long-sidebar-header').element().parentElement?.className).toContain(
    'overflow-hidden'
  );
  const sidebar = page.getByTestId('trip-sidebar').element();
  const pane = sidebar.parentElement?.parentElement?.querySelector('[data-slot="shell-content"]');
  expect(pane).not.toBeNull();
  expect(pane?.parentElement?.className).toContain('overflow-hidden');
  expect(pane?.parentElement?.className).not.toContain('overflow-y-auto');
});

test('actions float as the phone dock and sit in the title row from md', async () => {
  await useViewport(390, 844);
  await render(
    <Shell.Header
      actions={
        <>
          <Shell.Action icon={MoreHorizontal} iconOnly label="More" tone="secondary" />
          <Shell.Action icon={Plus} label="Create trip" />
        </>
      }
      lead={<span>30 going</span>}
      title="Trips"
    />
  );
  const dock = document.querySelector('[data-slot="shell-header-actions"]') as HTMLElement;
  expect(getComputedStyle(dock).position).toBe('fixed');
  expect(getComputedStyle(dock).flexDirection).toBe('column');
  const rect = dock.getBoundingClientRect();
  expect(window.innerWidth - rect.right).toBe(16);
  expect(window.innerHeight - rect.bottom).toBe(16);
  const [more, create] = Array.from(dock.children).map((child) => child.getBoundingClientRect());
  expect(create?.top).toBeGreaterThan(more?.bottom ?? 0);
  expect(create?.width).toBe(48);
  expect(more?.width).toBe(40);
  expect(Number(getComputedStyle(dock).zIndex)).toBeLessThan(50);
  await expect.element(page.getByText('30 going')).not.toBeVisible();
});

test('the dock lifts above a pinned composer with the page root', async () => {
  await useViewport(390, 844);
  await render(
    <Shell>
      <Shell.BannerLayout dockLift>
        <Shell.Header actions={<Shell.Action icon={Plus} label="New" />} title="Chat" />
      </Shell.BannerLayout>
    </Shell>
  );
  const dock = document.querySelector('[data-slot="shell-header-actions"]') as HTMLElement;
  expect(getComputedStyle(dock).getPropertyValue('--shell-dock-lift').trim()).toBe('5.5rem');
  expect(window.innerHeight - dock.getBoundingClientRect().bottom).toBe(16 + 88);
});

test('the dock is an inline row at the right of the title row from md', async () => {
  await useViewport(1280, 800);
  await render(
    <Shell.Header actions={<Shell.Action icon={Plus} label="Create trip" />} title="Trips" />
  );
  const dock = document.querySelector('[data-slot="shell-header-actions"]') as HTMLElement;
  expect(getComputedStyle(dock).position).toBe('static');
  expect(getComputedStyle(dock).flexDirection).toBe('row');
});

test('without actions the header renders no dock', async () => {
  await render(<Shell.Header actions={null} title="Trips" />);
  expect(document.querySelector('[data-slot="shell-header-actions"]')).toBeNull();
  await render(<Shell.Header actions={<>{null}</>} title="Trips" />);
  const dock = document.querySelector('[data-slot="shell-header-actions"]');
  if (dock) expect(getComputedStyle(dock).display).toBe('none');
});

test('the dock steps aside while a text field has focus on a phone', async () => {
  await useViewport(390, 844);
  await render(
    <>
      <Shell.Header actions={<Shell.Action icon={Plus} label="New" />} title="Trips" />
      <input aria-label="Search" />
      <input aria-label="Agree" type="checkbox" />
    </>
  );
  const dock = document.querySelector('[data-slot="shell-header-actions"]') as HTMLElement;
  expect(getComputedStyle(dock).visibility).toBe('visible');
  page.getByLabelText('Agree').element().focus();
  expect(getComputedStyle(dock).visibility).toBe('visible');
  page.getByLabelText('Search').element().focus();
  expect(getComputedStyle(dock).visibility).toBe('hidden');
  (document.activeElement as HTMLElement).blur();
  expect(getComputedStyle(dock).visibility).toBe('visible');
});
