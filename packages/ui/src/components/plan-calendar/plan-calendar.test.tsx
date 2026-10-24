import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlanCalendarEvent } from '#src/lib/plan-calendar';
import { PlanCalendar, type PlanCalendarProps } from '#tsx/components/plan-calendar/plan-calendar';

const plans: PlanCalendarEvent[] = [
  {
    id: 'hotel',
    title: 'Casa do Pátio',
    tone: 'stay',
    startDate: '2026-09-14',
    endDate: '2026-09-15'
  },
  {
    id: 'museum',
    title: 'Tile museum',
    tone: 'activity',
    notes: 'Leave time for the café.',
    startDate: '2026-09-14',
    startTime: '10:00',
    endTime: '12:00'
  }
];

function renderCalendar(props: Partial<PlanCalendarProps> = {}) {
  return render(
    <PlanCalendar endDate="2026-09-17" events={plans} startDate="2026-09-14" {...props} />
  );
}

test('labels columns with trip days and opens Kloq’s panel with the plan’s notes', async () => {
  renderCalendar();
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: /Tile museum/ })
    .first()
    .click();
  await expect.element(page.getByText('Leave time for the café.')).toBeVisible();
});

test('opens a plan read-only: no title field to edit', async () => {
  renderCalendar();
  await page
    .getByRole('button', { name: /Casa do Pátio/ })
    .first()
    .click();
  await expect.element(page.getByText('Casa do Pátio').first()).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Event title' })).not.toBeInTheDocument();
});

test('never starts a plan from a double-click on empty time', async () => {
  renderCalendar();
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  document
    .querySelector('[data-cal-canvas]')
    ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await expect.element(page.getByRole('textbox', { name: 'Event title' })).not.toBeInTheDocument();
});

test('a click on empty time picks the hour there to plan in', async () => {
  const onCreate = vi.fn();
  renderCalendar({ onCreate });
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  const canvas = document.querySelector<HTMLElement>('[data-cal-canvas]');
  if (!canvas) throw new Error('Expected the time grid');
  // 14:40 on Day 2: the slot starts at its half hour and runs an hour.
  const hour = canvas.offsetHeight / 24;
  await page.elementLocator(canvas).click({
    position: { x: (canvas.offsetWidth / 4) * 1.5, y: hour * 14 + (hour * 40) / 60 }
  });
  await expect
    .poll(() => onCreate.mock.calls[0]?.[0])
    .toEqual({
      startDate: '2026-09-15',
      endDate: '2026-09-15',
      startTime: '14:30',
      endTime: '15:30'
    });
});

test.each([
  ['with a timed plan', plans],
  ['with nothing timed', plans.filter((plan) => plan.startTime === undefined)]
])('opens the day grid below midnight %s', async (_name, events) => {
  renderCalendar({ events });
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  await expect
    .poll(() => {
      const canvas = document.querySelector<HTMLElement>('[data-cal-canvas]');
      for (let node = canvas?.parentElement; node; node = node.parentElement) {
        if (
          node.scrollHeight > node.clientHeight &&
          getComputedStyle(node).overflowY !== 'visible'
        ) {
          return node.scrollTop;
        }
      }
      return 0;
    })
    .toBeGreaterThan(0);
});

/** Every visible string and accessible name on the page, for hunting made-up dates. */
function everyLabel() {
  const attributes = [
    ...document.querySelectorAll('[aria-label],[title],[aria-description]')
  ].flatMap((node) =>
    ['aria-label', 'title', 'aria-description'].map((name) => node.getAttribute(name) ?? '')
  );
  return [document.body.innerText, ...attributes].join('\n');
}

test('an undated trip never prints a made-up date, visible or announced', async () => {
  // Opening the event panel makes Kloq update its own state after the click settles.
  expectConsole('error', /not wrapped in act/);
  const undatedPlans: PlanCalendarEvent[] = [
    {
      id: 'hotel',
      title: 'Casa do Pátio',
      tone: 'stay',
      startDate: '2001-01-01',
      endDate: '2001-01-02'
    },
    {
      id: 'museum',
      title: 'Tile museum',
      tone: 'activity',
      startDate: '2001-01-01',
      notes: 'Leave time for the café.',
      startTime: '10:00',
      endTime: '12:00'
    }
  ];
  renderCalendar({
    endDate: '2001-01-04',
    events: undatedPlans,
    startDate: '2001-01-01',
    undated: true
  });
  await expect.element(page.getByText('Day 1 – Day 4')).toBeVisible();
  await page
    .getByRole('button', { name: /Tile museum/ })
    .first()
    .click();
  await expect.element(page.getByText('Leave time for the café.')).toBeVisible();
  const labels = everyLabel();
  const madeUp = /January|Jan\b|2001|Monday|Tuesday|Sunday|Mon\b|Sun\b/u;
  expect(labels.split('\n').filter((line) => madeUp.test(line))).toEqual([]);
  expect(labels).toMatch(/Day 1/u);
});
