import { expect, test } from 'vite-plus/test';
import {
  defaultTripSection,
  isTripSection,
  sharedTripSection,
  tripSectionLabels,
  tripSections,
  tripSectionTitle,
  tripTabSections
} from './trip-sections';

test('recognizes every trip subpath and rejects unknown ones', () => {
  for (const section of tripSections) expect(isTripSection(section)).toBe(true);
  for (const unknown of ['', 'unknown', 'versions', 'plan']) {
    expect(isTripSection(unknown)).toBe(false);
  }
});

test('lists the shared trip tabs in reading order with Board first and the default', () => {
  expect(tripTabSections).toEqual([
    'board',
    'overview',
    'issues',
    'ideas',
    'polls',
    'research',
    'activity'
  ]);
  expect(defaultTripSection).toBe('board');
});

test('exposes a label for every trip section', () => {
  for (const section of tripSections) expect(tripSectionLabels[section]).not.toBe('');
  expect(tripSectionLabels.board).toBe('Board');
  expect(tripSectionLabels.overview).toBe('Overview');
});

test('titles each section by its tab label', () => {
  expect(tripSectionTitle('board')).toBe('Board');
  expect(tripSectionTitle('overview')).toBe('Overview');
  expect(tripSectionTitle('issues')).toBe('Issues');
  expect(tripSectionTitle('ideas')).toBe('Ideas');
  expect(tripSectionTitle('polls')).toBe('Polls');
  expect(tripSectionTitle('research')).toBe('Research');
  expect(tripSectionTitle('activity')).toBe('Activity');
  expect(tripSectionTitle('itinerary')).toBe('Itinerary');
});

test('sends the planning-only itinerary page to the overview tab of a shared trip', () => {
  expect(sharedTripSection('itinerary')).toBe('overview');
  for (const section of tripTabSections) expect(sharedTripSection(section)).toBe(section);
});
