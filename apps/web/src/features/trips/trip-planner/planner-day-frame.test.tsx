import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PlannerDayFrame } from './planner-day-frame';

const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

describe('PlannerDayFrame', () => {
  test('renders the day heading, date, subtitle and children', async () => {
    await render(
      <PlannerDayFrame
        ariaLabel="Day 2 Friday"
        date="Friday 2 May"
        day={2}
        subtitle="Lisbon → Porto"
      >
        <p>Body content</p>
      </PlannerDayFrame>
    );
    const section = page.getByRole('region', { name: 'Day 2 Friday' });
    await expect.element(section).toHaveAttribute('id', 'trip-day-2');
    await expect.element(page.getByRole('heading', { name: /Day 2/ })).toBeVisible();
    await expect.element(page.getByText('Friday 2 May')).toBeVisible();
    await expect.element(page.getByText('Lisbon → Porto')).toBeVisible();
    await expect.element(page.getByText('Body content')).toBeVisible();
  });

  test('omits the date when there is none', async () => {
    await render(
      <PlannerDayFrame ariaLabel="Day 1" date={null} day={1} subtitle="Open">
        <p>x</p>
      </PlannerDayFrame>
    );
    await expect.element(page.getByRole('heading', { name: 'Day 1' })).toBeVisible();
  });

  test.each([
    ['a photo source', { name: 'Lisbon', src: pixel }, 1],
    ['a null source', { name: 'Lisbon', src: null }, 0],
    ['no photo', undefined, 0]
  ])('with %s', async (_, photo, imageCount) => {
    await render(
      <PlannerDayFrame ariaLabel="Day 1" date={null} day={1} photo={photo} subtitle="s">
        <p>x</p>
      </PlannerDayFrame>
    );
    const images = page.getByRole('img', { name: 'Lisbon' });
    if (imageCount) await expect.element(images).toBeInTheDocument();
    else await expect.element(images).not.toBeInTheDocument();
  });
});
