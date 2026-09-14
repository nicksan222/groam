import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import {
  SHELL_CONTENT_PADDING,
  SHELL_HEADER_PADDING,
  SHELL_PAGE_INSET,
  SHELL_TITLE
} from '#src/lib/shell-layout';
import Shell from './client';

afterEach(cleanup);

test('applies shared shell padding tokens to header and content', async () => {
  render(
    <Shell>
      <Shell.Header data-testid="shell-header">
        <Shell.Title>Trips</Shell.Title>
      </Shell.Header>
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  await waitFor(() => expect(screen.getByText('Trip content')).not.toBeNull());
  const header = screen.getByTestId('shell-header');
  const content = screen.getByText('Trip content');

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
    expect(screen.getByRole('heading', { level: 1, name: 'Trips' }).className).toContain(token);
  }
});

test('forwards arbitrary data attributes on Title', () => {
  render(
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid="trip-heading" data-trip-name="Alpine Escape">
          Alpine Escape
        </Shell.Title>
      </Shell.Header>
    </Shell>
  );

  const heading = screen.getByTestId('trip-heading');
  expect(heading.getAttribute('data-trip-name')).toBe('Alpine Escape');
  expect(heading.tagName).toBe('H1');
});

test('content scrolls vertically without overflow-x-clip locking the y axis', async () => {
  render(
    <Shell>
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  await waitFor(() => expect(screen.getByText('Trip content')).not.toBeNull());
  const content = screen.getByText('Trip content');
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

test('renders banner page layout with standardized padding tokens', () => {
  render(
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

  const body = screen.getByTestId('trip-body');
  expect(body.getAttribute('data-slot')).toBe('shell-page-body');
  expect(body.className).toContain('px-4');
  expect(body.className).toContain('pt-5');
  expect(body.className).toContain('pb-16');
  expect(body.className).toContain('space-y-8');
});

test('renders notice banner with title, description, and action', () => {
  render(
    <Shell.NoticeBanner
      action={<button type="button">Start an idea</button>}
      aria-label="How ideas work"
      description="Look around. It stays put until someone adds an idea from their private copy."
      icon={Route}
      title="This is the shared plan"
    />
  );

  const note = screen.getByLabelText('How ideas work');
  expect(note.getAttribute('role')).toBe('note');
  expect(note.className).toContain('shadow-sm');
  expect(note.className).toContain('bg-muted/40');
  expect(note.className).toContain('px-4');
  expect(note.className).not.toContain('border-border');
  expect(note.className).not.toContain('rounded-xl');
  expect(note.className).not.toContain('hover:border-primary/40');
  expect(screen.getByText('This is the shared plan')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Start an idea' })).toBeDefined();
});

test('renders section header with badge and trailing content', () => {
  render(
    <Shell.SectionHeader
      badge="1 stop"
      density="compact"
      description="2 activities currently planned across the route."
      icon={Route}
      title="Route"
      trailing={<span>Add stop</span>}
    />
  );

  expect(screen.getByRole('heading', { name: 'Route' })).toBeDefined();
  expect(screen.getByText('1 stop')).toBeDefined();
  expect(screen.getByText('2 activities currently planned across the route.')).toBeDefined();
});

test('renders section header skeletons while loading', () => {
  const { container } = render(<Shell.SectionHeader density="compact" isLoading />);

  expect(screen.queryByRole('heading')).toBeNull();
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(1);
});

test('renders section stacks with reveal rhythm', () => {
  render(
    <Shell.Section data-testid="compact-section" stack="sm">
      Section content
    </Shell.Section>
  );

  const section = screen.getByTestId('compact-section');
  expect(section.className).toContain('dashboard-reveal');
  expect(section.className).toContain('space-y-3');
});

test('renders reveal wrapper for flush content blocks', () => {
  render(
    <Shell.Reveal data-testid="results">
      <span>Table body</span>
    </Shell.Reveal>
  );

  const reveal = screen.getByTestId('results');
  expect(reveal.getAttribute('data-slot')).toBe('shell-reveal');
  expect(reveal.className).toContain('dashboard-reveal');
});

test('registers layout primitives on the shell root', () => {
  expect(typeof Shell.Card).toBe('function');
  expect(typeof Shell.CardBody).toBe('function');
  expect(typeof Shell.CardFooter).toBe('function');
  expect(typeof Shell.CardHeader).toBe('function');
  expect(typeof Shell.Eyebrow).toBe('function');
  expect(typeof Shell.Reveal).toBe('function');
  expect(typeof Shell.Stack).toBe('function');
  expect(typeof Shell.Split).toBe('function');
  expect(typeof Shell.Split.Main).toBe('function');
  expect(typeof Shell.Split.Aside).toBe('function');
  expect(typeof Shell.UnderlineNav).toBe('function');
});

test('renders stack densitites and split layout', () => {
  render(
    <Shell.Stack data-testid="page-stack" stack="page">
      <Shell.Split data-testid="page-split">
        <Shell.Split.Main>Main</Shell.Split.Main>
        <Shell.Split.Aside sticky="near">Aside</Shell.Split.Aside>
      </Shell.Split>
    </Shell.Stack>
  );

  expect(screen.getByTestId('page-stack').className).toContain('space-y-6');
  expect(screen.getByTestId('page-split').className).toContain(
    'xl:grid-cols-[minmax(0,1fr)_22rem]'
  );
  expect(screen.getByText('Aside').className).toContain('xl:sticky');
});

test('split aside inherits a lower breakpoint from the parent grid', () => {
  render(
    <Shell.Split breakpoint="md" data-testid="md-split">
      <Shell.Split.Aside mobileDivider sticky="far">
        Aside
      </Shell.Split.Aside>
    </Shell.Split>
  );

  expect(screen.getByTestId('md-split').className).toContain('md:grid-cols-[minmax(0,1fr)_22rem]');
  expect(screen.getByText('Aside').className).toContain('md:sticky');
  expect(screen.getByText('Aside').className).toContain('md:border-t-0');
});

test('renders underline nav chrome around tabs', () => {
  render(
    <Shell.UnderlineNav aria-label="Trip sections" data-testid="section-nav">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
    </Shell.UnderlineNav>
  );

  const nav = screen.getByTestId('section-nav');
  expect(nav.tagName).toBe('NAV');
  expect(nav.className).toContain('border-b');
  expect(screen.getByRole('button', { name: 'Overview' })).toBeDefined();
});

test('renders card variants with standardized tokens', () => {
  render(
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

  expect(screen.getByTestId('panel-card').getAttribute('data-variant')).toBe('panel');
  expect(screen.getByTestId('panel-card').className).toContain('dashboard-panel');
  expect(screen.getByTestId('panel-card').className).toContain('dashboard-reveal');
  expect(screen.getByTestId('filled-card').className).toContain('dashboard-panel');
  expect(screen.getByTestId('dashed-card').className).toContain('border-dashed');
  expect(screen.getByTestId('callout-card').className).toContain('rounded-lg');
  expect(screen.getByTestId('callout-card').className).toContain('border-border');
  expect(
    screen.getByTestId('chrome-card').querySelector('[data-slot="shell-card-header"]')
  ).toBeTruthy();
  expect(
    screen.getByTestId('chrome-card').querySelector('[data-slot="shell-card-body"]')
  ).toBeTruthy();
  expect(
    screen.getByTestId('chrome-card').querySelector('[data-slot="shell-card-footer"]')
  ).toBeTruthy();
  expect(screen.getByTestId('eyebrow').getAttribute('data-tone')).toBe('primary');
});

test('renders property grid rows', () => {
  render(
    <Shell.PropertyGrid
      aria-label="Trip facts"
      items={[
        { label: 'Window', value: 'Flexible' },
        { label: 'Stops', numeric: true, value: '1' }
      ]}
    />
  );

  expect(screen.getByLabelText('Trip facts').tagName).toBe('DL');
  expect(screen.getByText('Window')).toBeDefined();
  expect(screen.getByText('Stops')).toBeDefined();
});

test('applies page inset to top underline tabs by default', () => {
  render(
    <Shell.TabContainer data-testid="banner-tabs" position="top" variant="underline">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
    </Shell.TabContainer>
  );

  expect(screen.getByTestId('banner-tabs').className).toContain('px-4');
});

test('renders underline tabs with GitHub-style active marker', () => {
  render(
    <Shell.TabContainer position="top" variant="underline">
      <Shell.Tab isActive onClick={() => undefined} position="top" title="Overview" />
      <Shell.Tab onClick={() => undefined} position="top" title="People (3)" />
    </Shell.TabContainer>
  );

  const overview = screen.getByRole('button', { name: 'Overview' });
  const people = screen.getByRole('button', { name: 'People (3)' });
  expect(overview.className).toContain('border-primary');
  expect(people.className).toContain('border-transparent');
});

test('renders actions once inside the shell header instead of as detached floating controls', async () => {
  render(
    <Shell>
      <Shell.Header data-testid="action-header">
        <Shell.Title>Trip overview</Shell.Title>
      </Shell.Header>
      <Shell.Action text="Edit trip" />
      <Shell.Action text="Archive" variant="ghost" />
      <Shell.Content>Trip content</Shell.Content>
    </Shell>
  );

  const header = within(screen.getByTestId('action-header'));
  await waitFor(() => {
    expect(header.getByRole('button', { name: 'Edit trip' })).not.toBeNull();
    expect(header.getByRole('button', { name: 'Archive' })).not.toBeNull();
  });
  expect(screen.getAllByRole('button', { name: 'Edit trip' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(1);
});

test('constrains long sidebar headers instead of widening the workspace', async () => {
  render(
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

  await waitFor(() => expect(screen.getByTestId('trip-sidebar')).not.toBeNull());
  expect(screen.getByTestId('trip-sidebar').className).toContain('overflow-hidden');
  expect(screen.getByTestId('long-sidebar-header').parentElement?.className).toContain(
    'overflow-hidden'
  );
  const sidebar = screen.getByTestId('trip-sidebar');
  const pane = sidebar.parentElement?.parentElement?.querySelector('[data-slot="shell-content"]');
  expect(pane).not.toBeNull();
  expect(pane?.parentElement?.className).toContain('overflow-hidden');
  expect(pane?.parentElement?.className).not.toContain('overflow-y-auto');
});

test('keeps actions scoped to their own shell', async () => {
  render(
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

  const firstHeader = within(screen.getByTestId('first-header'));
  const secondHeader = within(screen.getByTestId('second-header'));
  await waitFor(() => {
    expect(firstHeader.getByRole('button', { name: 'First action' })).not.toBeNull();
    expect(secondHeader.getByRole('button', { name: 'Second action' })).not.toBeNull();
  });
  expect(firstHeader.queryByRole('button', { name: 'Second action' })).toBeNull();
  expect(secondHeader.queryByRole('button', { name: 'First action' })).toBeNull();
});
