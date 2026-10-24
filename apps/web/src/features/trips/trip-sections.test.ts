import { expect, test } from 'vite-plus/test';
import {
  defaultTripSection,
  isTripSection,
  tripSectionConfig,
  tripSectionTitle,
  tripTabSections
} from './trip-sections';

test('recognizes every trip subpath and rejects unknown ones', () => {
  for (const section of tripTabSections) expect(isTripSection(section)).toBe(true);
  for (const unknown of ['', 'unknown', 'versions', 'overview', 'decide', 'itinerary']) {
    expect(isTripSection(unknown)).toBe(false);
  }
});

test('lists the shared trip tabs in reading order with Plan first and the default', () => {
  expect(tripTabSections).toEqual([
    'plan',
    'calendar',
    'map',
    'ideas',
    'issues',
    'polls',
    'packing',
    'research',
    'activity',
    'people'
  ]);
  expect(defaultTripSection).toBe('plan');
});

test('configures every shared section with a label, an icon, and a layout', () => {
  for (const section of tripTabSections) {
    const config = tripSectionConfig[section];
    expect(config.label).not.toBe('');
    expect(config.icon).toBeDefined();
    expect(['fill', 'padded']).toContain(config.layout);
  }
  expect(tripSectionConfig.plan.label).toBe('Plan');
  expect(Object.keys(tripSectionConfig)).toEqual([...tripTabSections].toSorted());
});

test('only the Calendar, and the Map fill the page', () => {
  expect(tripTabSections.filter((section) => tripSectionConfig[section].layout === 'fill')).toEqual(
    ['calendar', 'map']
  );
});

test('creation follows the section', () => {
  expect(tripSectionConfig.plan.primaryAction).toBe('idea');
  expect(tripSectionConfig.plan.primaryActionLabel).toBe('Suggest a change');
  expect(tripSectionConfig.map.primaryAction).toBe('idea');
  expect(tripSectionConfig.packing.primaryAction).toBe('idea');
  expect(tripSectionConfig.packing.primaryActionLabel).toBe('Suggest gear changes');
  expect(tripSectionConfig.calendar.primaryAction).toBe('idea');
  expect(tripSectionConfig.calendar.primaryActionLabel).toBe('Suggest a change');
  expect(tripSectionConfig.ideas.primaryAction).toBe('idea');
  expect(tripSectionConfig.issues.primaryAction).toBe('issue');
  expect(tripSectionConfig.polls.primaryAction).toBe('poll');
  expect(tripSectionConfig.activity.primaryAction).toBeUndefined();
  expect(tripSectionConfig.people.primaryAction).toBe('invite');
});

test('titles each section by its tab label', () => {
  expect(tripSectionTitle('plan')).toBe('Plan');
  expect(tripSectionTitle('calendar')).toBe('Calendar');
  expect(tripSectionTitle('ideas')).toBe('Ideas');
  expect(tripSectionTitle('issues')).toBe('Issues');
  expect(tripSectionTitle('polls')).toBe('Polls');
  expect(tripSectionTitle('research')).toBe('Research');
  expect(tripSectionTitle('activity')).toBe('Activity');
  expect(tripSectionTitle('people')).toBe('People');
});

test('lists Ideas, Issues, and Polls as their own sections and drops the merged ones', () => {
  expect(tripTabSections.slice(3, 6)).toEqual(['ideas', 'issues', 'polls']);
  for (const old of ['decide', 'overview']) expect(isTripSection(old)).toBe(false);
});
