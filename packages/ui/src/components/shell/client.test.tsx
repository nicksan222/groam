import { render } from '@groam/vitest-config/react';
import { Route } from 'lucide-react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  SHELL_CONTENT_PADDING,
  SHELL_HEADER_PADDING,
  SHELL_PAGE_INSET,
  SHELL_TITLE
} from '#src/lib/shell-layout';
import Shell from './client';

test('applies shared shell padding tokens to header and content', async () => {
  await render(
    <Shell>
      <Shell.Header data-testid="shell-header">
        <Shell.Title>Trips</Shell.Title>
      </Shell.Header>
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  await expect.element(page.getByText('Trip content')).toBeInTheDocument();
  const header = page.getByTestId('shell-header').element();
  const content = page.getByText('Trip content').element();

  for (const token of SHELL_PAGE_INSET.split(' ')) {
    expect(header.className).toContain(token);
    expect(content.className).toContain(token);
  }
  for (const token of SHELL_HEADER_PADDING.split(' ')) {
    expect(header.className).toContain(token);
  }
  for (const token of SHELL_CONTENT_PADDING.split(' ')) {
    expect(content.className).toContain(token);
  }
  for (const token of SHELL_TITLE.split(' ')) {
    await expect.element(page.getByRole('heading', { level: 1, name: 'Trips' })).toHaveClass(token);
  }
});

test('forwards arbitrary data attributes on Title', async () => {
  await render(
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid="trip-heading" data-trip-name="Alpine Escape">
          Alpine Escape
        </Shell.Title>
      </Shell.Header>
    </Shell>
  );

  const heading = page.getByTestId('trip-heading').element();
  expect(heading.getAttribute('data-trip-name')).toBe('Alpine Escape');
  expect(heading.tagName).toBe('H1');
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
  expect(content.className).toContain('px-4');
  expect(content.className).toContain('sm:px-6');
  expect(content.className).toContain('lg:px-8');
  expect(content.className).not.toContain('overflow-x-clip');
  const shell = content.parentElement?.parentElement;
  expect(shell?.className).toContain('overflow-hidden');
  expect(shell?.className).not.toContain('overflow-x-clip');
});

test('renders banner page layout with standardized padding tokens', async () => {
  await render(
    <Shell>
      <Shell.BannerLayout>
        <Shell.Banner>
          <Shell.BannerCrumb>
            <span>Back</span>
          </Shell.BannerCrumb>
          <Shell.BannerHeading description="Trip details" title="Lisbon weekend" />
        </Shell.Banner>
        <Shell.PageBody data-testid="trip-body" variant="overview">
          Overview content
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );

  const body = page.getByTestId('trip-body').element();
  expect(body.getAttribute('data-slot')).toBe('shell-page-body');
  expect(body.className).toContain('px-4');
  expect(body.className).toContain('pt-5');
  expect(body.className).toContain('pb-16');
  expect(body.className).toContain('space-y-8');
});

test('renders notice banner with title, description, and action', async () => {
  await render(
    <Shell.NoticeBanner
      action={<button type="button">Start an idea</button>}
      aria-label="How ideas work"
      description="Look around. It stays put until someone adds an idea from their private copy."
      icon={Route}
      title="This is the shared plan"
    />
  );

  const note = page.getByLabelText('How ideas work').element();
  expect(note.getAttribute('role')).toBe('note');
  expect(note.className).toContain('shadow-sm');
  expect(note.className).toContain('bg-muted/40');
  expect(note.className).toContain('px-4');
  expect(note.className).not.toContain('border-border');
  expect(note.className).not.toContain('rounded-xl');
  expect(note.className).not.toContain('hover:border-primary/40');
  await expect.element(page.getByText('This is the shared plan')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Start an idea' })).toBeInTheDocument();
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

test('renders underline tabs with GitHub-style active marker', async () => {
  await render(
    <Shell.TabContainer position="top" variant="underline">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
      <Shell.Tab onClick={() => undefined} position="top" title="People (3)" />
    </Shell.TabContainer>
  );

  const overview = page.getByRole('button', { name: 'Overview' }).element();
  const people = page.getByRole('button', { name: 'People (3)' }).element();
  expect(overview.className).toContain('border-primary');
  expect(people.className).toContain('border-transparent');
});

test('renders actions once inside the shell header instead of as detached floating controls', async () => {
  await render(
    <Shell>
      <Shell.Header data-testid="action-header">
        <Shell.Title>Trip overview</Shell.Title>
      </Shell.Header>
      <Shell.Action text="Edit trip" />
      <Shell.Action text="Archive" variant="ghost" />
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  const header = page.getByTestId('action-header');
  await vi.waitFor(() => {
    expect(header.getByRole('button', { name: 'Edit trip' }).element()).not.toBeNull();
    expect(header.getByRole('button', { name: 'Archive' }).element()).not.toBeNull();
  });
  expect(page.getByRole('button', { name: 'Edit trip' }).elements()).toHaveLength(1);
  expect(page.getByRole('button', { name: 'Archive' }).elements()).toHaveLength(1);
});

test('constrains long sidebar headers instead of widening the workspace', async () => {
  await render(
    <Shell>
      <Shell.Header>
        <Shell.Title>Trip overview</Shell.Title>
      </Shell.Header>
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

test('keeps actions scoped to their own shell', async () => {
  await render(
    <>
      <Shell>
        <Shell.Header data-testid="first-header">
          <Shell.Title>First shell</Shell.Title>
        </Shell.Header>
        <Shell.Action text="First action" />
        <Shell.Content>First content</Shell.Content>
      </Shell>
      <Shell>
        <Shell.Header data-testid="second-header">
          <Shell.Title>Second shell</Shell.Title>
        </Shell.Header>
        <Shell.Action text="Second action" />
        <Shell.Content>Second content</Shell.Content>
      </Shell>
    </>
  );

  const firstHeader = page.getByTestId('first-header');
  const secondHeader = page.getByTestId('second-header');
  await vi.waitFor(() => {
    expect(firstHeader.getByRole('button', { name: 'First action' }).element()).not.toBeNull();
    expect(secondHeader.getByRole('button', { name: 'Second action' }).element()).not.toBeNull();
  });
  expect(firstHeader.getByRole('button', { name: 'Second action' }).query()).toBeNull();
  expect(secondHeader.getByRole('button', { name: 'First action' }).query()).toBeNull();
});
