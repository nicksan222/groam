import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { List } from './index';
import { useListSearchShortcut } from './use-list-search-shortcut';

function Rows({ cursor }: { cursor?: string }) {
  return (
    <List.Group label="Your turn" count={2}>
      {['Beach day', 'Art museum'].map((title) => (
        <List.Row cursor={cursor === title} data-testid="row" key={title}>
          <List.Leading>
            <List.Checkbox label={`Select ${title}`} onToggle={() => {}} selected={false} />
          </List.Leading>
          <List.Icon>
            <span aria-hidden data-testid="glyph" />
          </List.Icon>
          <List.Main>
            <List.Title asChild>
              <a href={`#${title}`}>{title}</a>
            </List.Title>
            <List.Aside>Oct 3</List.Aside>
            <List.Description>Short excerpt</List.Description>
          </List.Main>
          <List.Meta>Mandatory</List.Meta>
          <List.Avatar>
            <span aria-label="Alex" role="img" />
          </List.Avatar>
          <List.Age>
            <time>2d</time>
          </List.Age>
        </List.Row>
      ))}
    </List.Group>
  );
}

test('names the group list by its heading and exposes rows as list items', async () => {
  await render(
    <List>
      <List.Body>
        <Rows />
      </List.Body>
    </List>
  );
  await expect.element(page.getByRole('heading', { name: 'Your turn · 2' })).toBeVisible();
  await expect.element(page.getByRole('list', { name: 'Your turn · 2' })).toBeInTheDocument();
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
});

test('folds a group through its header button', async () => {
  function Example() {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <List.Group collapsed={collapsed} label="Later" onToggle={() => setCollapsed((c) => !c)}>
        <List.Row>
          <List.Main>
            <List.Title>One</List.Title>
          </List.Main>
        </List.Row>
      </List.Group>
    );
  }
  await render(<Example />);
  const toggle = page.getByRole('button', { name: 'Later' });
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(page.getByRole('listitem').elements()).toHaveLength(0);
});

test('renders an unlabeled group as a bare labelled list and a static header without a button', async () => {
  await render(
    <>
      <List.Group aria-label="Chats">
        <List.Row>
          <List.Main>
            <List.Title>Dinner</List.Title>
          </List.Main>
        </List.Row>
      </List.Group>
      <List.Group label="Static">
        <List.Row>
          <List.Main>
            <List.Title>Inside</List.Title>
          </List.Main>
        </List.Row>
      </List.Group>
    </>
  );
  await expect.element(page.getByRole('list', { name: 'Chats' })).toBeInTheDocument();
  expect(page.getByRole('button').elements()).toHaveLength(0);
});

test('marks the cursor, selected, and attention rows', async () => {
  await render(
    <>
      <List.Row cursor data-testid="a" />
      <List.Row selected data-testid="b" />
      <List.Row attention data-testid="c" />
    </>
  );
  await expect.element(page.getByTestId('a')).toHaveAttribute('data-cursor', 'true');
  await expect.element(page.getByTestId('b')).toHaveAttribute('data-selected', 'true');
  await expect.element(page.getByTestId('c')).not.toHaveAttribute('data-cursor');
});

test('lays wide rows out in columns and the title link covers the row', async () => {
  await useViewport(1280, 800);
  await render(
    <List>
      <List.Body>
        <Rows />
      </List.Body>
    </List>
  );
  const row = page.getByTestId('row').first().element();
  const link = page.getByRole('link', { name: 'Beach day' }).element();
  const rowBox = row.getBoundingClientRect();
  const title = link.getBoundingClientRect();
  const glyph = row.querySelector('[data-testid="glyph"]')!.getBoundingClientRect();
  const age = row.querySelector('[data-slot="list-age"]')!.getBoundingClientRect();
  expect(glyph.left).toBeLessThan(title.left);
  expect(age.left).toBeGreaterThan(title.right);
  expect(
    row.querySelector('[data-slot="list-meta"]')!.getBoundingClientRect().width
  ).toBeGreaterThan(0);
  // The row's second line sits under the title.
  const description = row.querySelector('[data-slot="list-description"]')!.getBoundingClientRect();
  expect(description.top).toBeGreaterThanOrEqual(title.bottom);
  expect(description.left).toBe(title.left);
  expect(document.elementFromPoint(rowBox.left + rowBox.width / 2, rowBox.top + 4)).toBe(link);
});

test('drops the wide-only slots on a phone but keeps the avatar', async () => {
  await useViewport(390, 844);
  await render(
    <div style={{ padding: '0 16px' }}>
      <List>
        <List.Body>
          <Rows />
        </List.Body>
      </List>
    </div>
  );
  const row = page.getByTestId('row').first().element();
  expect(getComputedStyle(row.querySelector('[data-slot="list-meta"]')!).display).toBe('none');
  expect(getComputedStyle(row.querySelector('[data-slot="list-age"]')!).display).toBe('none');
  expect(getComputedStyle(row.querySelector('[data-slot="list-leading"]')!).display).toBe('none');
  const avatar = row.querySelector('[data-slot="list-avatar"]')!.getBoundingClientRect();
  expect(avatar.right).toBeLessThanOrEqual(row.getBoundingClientRect().right);
  expect(avatar.width).toBeGreaterThan(0);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});

test('toggles the checkbox with its label', async () => {
  const onToggle = vi.fn();
  await render(<List.Checkbox label="Select Dinner" onToggle={onToggle} selected />);
  const box = page.getByRole('checkbox', { name: 'Select Dinner' });
  await expect.element(box).toHaveAttribute('aria-checked', 'true');
  await box.click();
  expect(onToggle).toHaveBeenCalledOnce();
});

test('pins the footer to the bottom of a short, filled list', async () => {
  await useViewport(1280, 800);
  await render(
    <div
      data-testid="pane"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 600,
        padding: '0 24px 32px',
        width: 900
      }}
    >
      <List fill>
        <List.Body>
          <List.Empty headline="Nothing yet" />
        </List.Body>
        <List.Footer desktopOnly>
          <List.Hints hints={[{ keys: 'J K', label: 'move' }]} />
        </List.Footer>
      </List>
    </div>
  );
  const pane = page.getByTestId('pane').element().getBoundingClientRect();
  const footer = page.getByRole('contentinfo').element().getBoundingClientRect();
  expect(footer.bottom).toBe(pane.bottom);
  expect(footer.left).toBe(pane.left);
  expect(footer.right).toBe(pane.right);
  const footerElement = page.getByRole('contentinfo').element();
  expect(footerElement.querySelectorAll('kbd')).toHaveLength(2);
  expect(footerElement.textContent).toContain('move');
});

test('hides a desktop-only footer on a phone', async () => {
  await useViewport(390, 844);
  await render(
    <List>
      <List.Footer data-testid="footer" desktopOnly>
        hints
      </List.Footer>
    </List>
  );
  expect(getComputedStyle(page.getByTestId('footer').element()).display).toBe('none');
});

test('announces empty states', async () => {
  await render(
    <List>
      <List.Body>
        <List.Empty description="Try again" headline="No matches" />
      </List.Body>
    </List>
  );
  await expect.element(page.getByText('No matches')).toBeVisible();
});

test('clears the search and the extra filters from the toolbar', async () => {
  const onClear = vi.fn();
  function Example() {
    const [query, setQuery] = useState('beach');
    return (
      <List.Toolbar
        noun={{ singular: 'idea', plural: 'ideas' }}
        onClear={onClear}
        onQueryChange={setQuery}
        query={query}
      >
        <span>extra</span>
      </List.Toolbar>
    );
  }
  await render(<Example />);
  await expect.element(page.getByText('extra')).toBeVisible();
  await page.getByRole('button', { name: 'Clear idea filters' }).click();
  await expect.element(page.getByRole('searchbox', { name: 'Search ideas' })).toHaveValue('');
  expect(onClear).toHaveBeenCalledOnce();
});

test('sort lists its options and reports the choice', async () => {
  const onValueChange = vi.fn();
  await render(
    <List.Sort
      noun={{ singular: 'member', plural: 'members' }}
      onValueChange={onValueChange}
      options={[
        { label: 'Group order', value: 'default' },
        { label: 'Name A–Z', value: 'name' }
      ]}
      value="default"
    />
  );
  await page.getByLabelText('Sort members').click();
  await page.getByRole('radio', { name: 'Name A–Z' }).click();
  expect(onValueChange).toHaveBeenCalledWith('name');
});

test('actions stay visible on a phone while meta hides', async () => {
  await useViewport(390, 844);
  await render(
    <List>
      <List.Body>
        <List.Group aria-label="Codes">
          <List.Row>
            <List.Main>
              <List.Title>ABCD</List.Title>
            </List.Main>
            <List.Meta>Member</List.Meta>
            <List.Actions>
              <button type="button">Revoke</button>
            </List.Actions>
          </List.Row>
        </List.Group>
      </List.Body>
    </List>
  );
  await expect.element(page.getByRole('button', { name: 'Revoke' })).toBeVisible();
  await expect.element(page.getByText('Member')).not.toBeVisible();
});

const assigneeFacet = {
  description: 'Who holds it',
  key: 'assignee',
  values: [{ value: 'me' }, { description: 'Sam Lee', value: 'sam' }]
};

function SearchHarness() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  return (
    <List>
      <List.Search
        count={{ shown: 2, total: 5 }}
        facets={[assigneeFacet]}
        noun={{ plural: 'ideas', singular: 'idea' }}
        onOpenChange={setOpen}
        onQueryChange={setQuery}
        open={open}
        query={query}
      />
      <List.Footer>
        <List.Hints
          hints={[
            { keys: '↑ ↓', label: 'move' },
            { keys: 'K', label: 'filter', onClick: () => setOpen(true) }
          ]}
        />
      </List.Footer>
    </List>
  );
}

test('List.Search opens on K or its hint, keeps the query as a bar, and clears it', async () => {
  await render(<SearchHarness />);
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await userEvent.keyboard('k');
  await expect.element(page.getByRole('combobox')).toBeVisible();
  await userEvent.type(page.getByRole('combobox'), 'beach');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Edit filter' }))
    .toHaveTextContent('beach');
  await expect.element(page.getByText('2 of 5 ideas')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect.element(page.getByRole('button', { name: 'Edit filter' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: /filter/u }).click();
  await expect.element(page.getByRole('combobox')).toHaveFocus();
});

test('the active filter bar shows recognised words as chips and the rest as text', async () => {
  await render(<SearchHarness />);
  await userEvent.keyboard('k');
  await userEvent.type(page.getByRole('combobox'), 'beach assignee:me ');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('button', { name: 'Edit filter' })).toBeVisible();
  const chips = page.getByRole('button', { name: 'Edit filter' }).element();
  expect(chips.querySelectorAll('[data-slot="list-search-chip"]')).toHaveLength(1);
  expect(chips.textContent).toContain('beach');
  expect(chips.querySelector('[data-slot="list-search-chip"]')?.textContent).toBe('assignee:me');
});

test('a hint that does something is a button; the others stay flat text', async () => {
  await render(<SearchHarness />);
  await page.getByRole('button', { name: /filter/u }).click();
  await expect.element(page.getByRole('combobox')).toBeVisible();
  expect(page.getByRole('button', { name: /move/u }).elements()).toHaveLength(0);
});

test('List.Search commits the query only once typing pauses, and at once on Enter', async () => {
  const onQueryChange = vi.fn();
  await render(
    <List.Search
      noun={{ plural: 'ideas', singular: 'idea' }}
      onOpenChange={() => {}}
      onQueryChange={onQueryChange}
      open
      query=""
    />
  );
  const box = page.getByRole('combobox');
  await userEvent.type(box, 'bea');
  expect(onQueryChange).not.toHaveBeenCalled();
  await expect.poll(() => onQueryChange.mock.calls).toEqual([['bea']]);
  await userEvent.type(box, 'ch{Enter}');
  expect(onQueryChange).toHaveBeenLastCalledWith('beach');
});

function HintsHarness({ onQueryChange = () => {} }: { onQueryChange?: (query: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <List.Search
      facets={[assigneeFacet]}
      noun={{ plural: 'issues', singular: 'issue' }}
      onOpenChange={setOpen}
      onQueryChange={onQueryChange}
      open={open}
      query=""
    />
  );
}

test('an empty filter offers complete example values under a Filters label', async () => {
  await render(<HintsHarness />);
  const group = page.getByRole('group', { name: 'Filters' });
  await expect.element(group).toBeVisible();
  await expect.element(page.getByRole('option', { name: /assignee:me/u })).toBeVisible();
  const box = page.getByRole('combobox');
  await expect.element(box).toHaveAttribute('aria-expanded', 'true');
  await expect.element(box).toHaveAttribute('aria-autocomplete', 'list');
  // The first hint is highlighted from the start, as in the palette.
  const first = page.getByRole('option', { name: /assignee:me/u });
  await expect.element(first).toHaveAttribute('aria-selected', 'true');
  await expect
    .element(box)
    .toHaveAttribute('aria-activedescendant', first.element().getAttribute('id') ?? '');
  expect(first.element().getAttribute('tabindex')).toBe('-1');
  await userEvent.keyboard('{ArrowDown}');
  const second = page.getByRole('option', { name: /assignee:sam/u });
  await expect.element(second).toHaveAttribute('aria-selected', 'true');
  await expect.element(first).toHaveAttribute('aria-selected', 'false');
});

test('hint rows put their text on the input gutter and options sit in labelled groups', async () => {
  await render(<HintsHarness />);
  const box = page.getByRole('combobox').element();
  const input = box.getBoundingClientRect();
  const label = page
    .getByRole('option', { name: /assignee:me/u })
    .element()
    .querySelector('span');
  const heading = page.getByText('Filters', { exact: true }).element();
  const textLeft = (element: Element | null) => {
    const range = document.createRange();
    if (element) range.selectNodeContents(element);
    return Math.round(range.getBoundingClientRect().left);
  };
  expect(textLeft(label)).toBe(Math.round(input.left));
  expect(textLeft(heading)).toBe(Math.round(input.left));
  const listbox = page.getByRole('listbox').element();
  expect(listbox.querySelectorAll(':scope > [role="group"]').length).toBe(1);
  expect(listbox.querySelectorAll(':scope > [role="option"]').length).toBe(0);
});

test('typed values are mirrored behind the input as tokens, key muted and value apart', async () => {
  function Typed() {
    const [open, setOpen] = useState(true);
    return (
      <List.Search
        facets={[assigneeFacet]}
        noun={{ plural: 'issues', singular: 'issue' }}
        onOpenChange={setOpen}
        onQueryChange={() => {}}
        open={open}
        query=""
      />
    );
  }
  await render(<Typed />);
  const box = page.getByRole('combobox');
  expect(document.querySelector('[data-slot="list-search-token"]')).toBeNull();
  await userEvent.type(box, 'beach assignee:me nope:x');
  const mirror = document.querySelector('[data-slot="list-search-mirror"]');
  await expect.poll(() => mirror?.textContent).toBe('beach assignee:me nope:x');
  const tokens = [...(mirror?.querySelectorAll('[data-slot="list-search-token"]') ?? [])];
  expect(tokens.map((token) => token.textContent)).toEqual(['assignee:me']);
  expect(tokens[0]?.children[0]?.textContent).toBe('assignee:');
  expect(tokens[0]?.children[1]?.textContent).toBe('me');
  expect(mirror?.getAttribute('aria-hidden')).toBe('true');
  // The mirror adds nothing to the text: same font, size, and starting edge as the input.
  const field = getComputedStyle(box.element());
  const copy = getComputedStyle(mirror as Element);
  expect(copy.fontSize).toBe(field.fontSize);
  expect(copy.fontFamily).toBe(field.fontFamily);
  expect(copy.letterSpacing).toBe(field.letterSpacing);
  const start = mirror?.querySelector('span')?.getBoundingClientRect().left;
  expect(Math.round(start ?? -1)).toBe(Math.round(box.element().getBoundingClientRect().left));
});

test('List.Search hints complete key:value filters with Tab and Enter', async () => {
  const onQueryChange = vi.fn();
  await render(<HintsHarness onQueryChange={onQueryChange} />);
  const box = page.getByRole('combobox');
  await userEvent.type(box, 'ass');
  await userEvent.keyboard('{Tab}');
  await expect.element(box).toHaveValue('assignee:');
  await expect.element(page.getByRole('option', { name: /assignee:sam/u })).toBeVisible();
  await expect.element(page.getByText('Sam Lee')).toBeVisible();
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.element(box).toHaveValue('assignee:sam ');
  expect(onQueryChange).toHaveBeenLastCalledWith('assignee:sam ');
  // A finished word offers nothing, so the dialog does not jump while typing the next one.
  await expect.element(page.getByRole('option')).not.toBeInTheDocument();
});

test('Enter closes while the first hint is only the default, and applies it once a word is started', async () => {
  const onOpenChange = vi.fn();
  const onQueryChange = vi.fn();
  await render(
    <List.Search
      facets={[assigneeFacet]}
      noun={{ plural: 'issues', singular: 'issue' }}
      onOpenChange={onOpenChange}
      onQueryChange={onQueryChange}
      open
      query=""
    />
  );
  const box = page.getByRole('combobox');
  await userEvent.keyboard('{Enter}');
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
  onOpenChange.mockClear();
  await userEvent.type(box, 'as{Enter}');
  await expect.element(box).toHaveValue('assignee:');
  expect(onOpenChange).not.toHaveBeenCalled();
  // A word that is already the highlighted hint has nothing to complete, so Enter is done.
  await userEvent.type(box, 'me{Enter}');
  expect(onQueryChange).toHaveBeenLastCalledWith('assignee:me');
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

test('one stray letter suggests no keys; the empty state names the keys that exist', async () => {
  await render(<HintsHarness />);
  const box = page.getByRole('combobox');
  await userEvent.type(box, 'a');
  await expect.element(page.getByRole('option')).not.toBeInTheDocument();
  await expect.element(page.getByText('Matching titles. Try assignee: to filter.')).toBeVisible();
  await userEvent.type(box, 's');
  await expect.element(page.getByRole('option', { name: /assignee:/u })).toBeVisible();
});

test('without facets the empty state only says what the text matches', async () => {
  await render(
    <List.Search
      noun={{ plural: 'ideas', singular: 'idea' }}
      onOpenChange={() => {}}
      onQueryChange={() => {}}
      open
      query="beach"
    />
  );
  await expect.element(page.getByText('Matching titles.', { exact: true })).toBeVisible();
});

test('the footer names the keys that work now', async () => {
  await render(<HintsHarness />);
  const footer = () => document.querySelector('[data-slot="list-search-footer"]');
  expect(footer()?.textContent).toContain('navigate');
  expect(footer()?.textContent).not.toContain('complete');
  expect(footer()?.textContent).toContain('done');
  await userEvent.type(page.getByRole('combobox'), 'as');
  await expect.poll(() => footer()?.textContent).toContain('complete');
});

test('on a phone the footer hides and Done commits the query and closes', async () => {
  await useViewport(390, 844);
  const onOpenChange = vi.fn();
  const onQueryChange = vi.fn();
  await render(
    <List.Search
      facets={[assigneeFacet]}
      noun={{ plural: 'issues', singular: 'issue' }}
      onOpenChange={onOpenChange}
      onQueryChange={onQueryChange}
      open
      query=""
    />
  );
  await expect.element(page.getByText('navigate')).not.toBeVisible();
  await userEvent.type(page.getByRole('combobox'), 'beach');
  await page.getByRole('button', { name: 'Done' }).click();
  expect(onQueryChange).toHaveBeenLastCalledWith('beach');
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

test('Tab leaves the field when no word is started and nothing is highlighted', async () => {
  await render(<HintsHarness />);
  const box = page.getByRole('combobox');
  await userEvent.keyboard('{Tab}');
  await expect.element(box).toHaveValue('');
});

test('the highlight follows the mouse and resets when the dialog reopens', async () => {
  function Reopen() {
    const [open, setOpen] = useState(true);
    return (
      <List.Search
        facets={[assigneeFacet]}
        noun={{ plural: 'issues', singular: 'issue' }}
        onOpenChange={setOpen}
        onQueryChange={() => {}}
        open={open}
        query=""
      />
    );
  }
  await render(<Reopen />);
  await page.getByRole('option', { name: /assignee:sam/u }).hover();
  await expect
    .element(page.getByRole('option', { name: /assignee:sam/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await userEvent.keyboard('k');
  await expect
    .element(page.getByRole('option', { name: /assignee:sam/u }))
    .toHaveAttribute('aria-selected', 'false');
});

test('List.Sort opens a dialog with every ordering and marks the current choice', async () => {
  const change = vi.fn();
  await render(
    <List.Sort
      noun={{ plural: 'events', singular: 'event' }}
      onValueChange={change}
      options={[
        { label: 'Newest first', value: 'newest' },
        { label: 'Oldest first', value: 'oldest' }
      ]}
      value="newest"
    />
  );
  await page.getByRole('button', { name: 'Sort events' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Sort events' })).toBeVisible();
  await expect.element(page.getByRole('radio', { name: 'Newest first' })).toBeChecked();
  await page.getByRole('radio', { name: 'Oldest first' }).click();
  expect(change).toHaveBeenCalledWith('oldest');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
});

test('a phone footer reaches the pane edge through the page dock clearance', async () => {
  await useViewport(390, 844);
  const { shellPageBodyClassName } = await import('@groam/ui/lib/shell-layout');
  await render(
    <div className={shellPageBodyClassName()} data-testid="phone-pane" style={{ height: 600 }}>
      <List fill>
        <List.Body>
          <List.Empty headline="Nothing yet" />
        </List.Body>
        <List.Footer clearDock>
          <List.Controls>
            <List.SearchTrigger onClick={() => {}} />
          </List.Controls>
        </List.Footer>
      </List>
    </div>
  );
  const pane = page.getByTestId('phone-pane').element().getBoundingClientRect();
  const footer = page.getByRole('contentinfo').element().getBoundingClientRect();
  expect(Math.abs(footer.bottom - pane.bottom)).toBeLessThan(1);
});

test('a narrow desktop footer keeps both controls within its height', async () => {
  await useViewport(800, 800);
  await render(
    <div style={{ width: 495 }}>
      <List bleed={false}>
        <List.Footer>
          <List.Hints
            desktopOnly
            hints={[
              { keys: '↑ ↓', label: 'move' },
              { keys: 'X', label: 'select' },
              { keys: '↵', label: 'open' },
              { keys: 'C', label: 'new', onClick: () => {} }
            ]}
          />
          <List.Controls>
            <List.Sort
              noun={{ plural: 'items', singular: 'item' }}
              onValueChange={() => {}}
              options={[{ label: 'Newest first', value: 'newest' }]}
              value="newest"
            />
            <List.SearchTrigger onClick={() => {}} />
          </List.Controls>
        </List.Footer>
      </List>
    </div>
  );
  const footer = page.getByRole('contentinfo').element().getBoundingClientRect();
  for (const control of page
    .getByRole('group', { name: 'List controls' })
    .element()
    .querySelectorAll('button')) {
    const box = control.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(footer.top);
    expect(box.bottom).toBeLessThanOrEqual(footer.bottom);
  }
});

test('the K shortcut calls the latest open callback without re-attaching its listener', async () => {
  const add = vi.spyOn(window, 'addEventListener');
  const calls: string[] = [];
  function Shortcut({ label }: { label: string }) {
    useListSearchShortcut(() => calls.push(label));
    return null;
  }
  const view = await render(<Shortcut label="first" />);
  const attached = () => add.mock.calls.filter(([type]) => type === 'keydown').length;
  const before = attached();
  await view.rerender(<Shortcut label="second" />);
  expect(attached()).toBe(before);
  await userEvent.keyboard('k');
  expect(calls).toEqual(['second']);
  add.mockRestore();
});

test('a controlled sort opens from an external action while its footer trigger is hidden', async () => {
  function ExternalSort() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open sort action</button>
        <div hidden>
          <List.Sort
            noun={{ plural: 'events', singular: 'event' }}
            onOpenChange={setOpen}
            onValueChange={() => {}}
            open={open}
            options={[
              { label: 'Newest first', value: 'newest' },
              { label: 'Oldest first', value: 'oldest' }
            ]}
            value="newest"
          />
        </div>
      </>
    );
  }
  await render(<ExternalSort />);
  const action = page.getByRole('button', { name: 'Open sort action' });
  await action.click();
  await expect.element(page.getByRole('dialog', { name: 'Sort events' })).toBeVisible();
  await page.getByRole('radio', { name: 'Oldest first' }).click();
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  expect(document.activeElement).toBe(action.element());
});
