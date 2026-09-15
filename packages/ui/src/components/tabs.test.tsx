import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#tsx/components/tabs';

afterEach(cleanup);

test('connects the selected tab with its visible panel', () => {
  render(
    <Tabs defaultValue="day">
      <TabsList aria-label="Planning tools">
        <TabsTrigger value="day">Day planner</TabsTrigger>
        <TabsTrigger value="route">Route</TabsTrigger>
      </TabsList>
      <TabsContent value="day">Day content</TabsContent>
      <TabsContent value="route">Route content</TabsContent>
    </Tabs>
  );
  expect(screen.getByRole('tabpanel', { name: 'Day planner' }).textContent).toBe('Day content');
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Route' }), { button: 0, ctrlKey: false });
  expect(screen.getByRole('tabpanel', { name: 'Route' }).textContent).toBe('Route content');
  expect(screen.queryByRole('tabpanel', { name: 'Day planner' })).toBeNull();
});
