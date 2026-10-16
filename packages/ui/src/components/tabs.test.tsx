import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#tsx/components/tabs';

test('connects the selected tab with its visible panel', async () => {
  await render(
    <Tabs defaultValue="day">
      <TabsList aria-label="Planning tools">
        <TabsTrigger value="day">Day planner</TabsTrigger>
        <TabsTrigger value="route">Route</TabsTrigger>
      </TabsList>
      <TabsContent value="day">Day content</TabsContent>
      <TabsContent value="route">Route content</TabsContent>
    </Tabs>
  );
  expect(page.getByRole('tabpanel', { name: 'Day planner' }).element().textContent).toBe(
    'Day content'
  );
  await page.getByRole('tab', { name: 'Route' }).click();
  expect(page.getByRole('tabpanel', { name: 'Route' }).element().textContent).toBe('Route content');
  await expect.element(page.getByRole('tabpanel', { name: 'Day planner' })).not.toBeInTheDocument();
});
