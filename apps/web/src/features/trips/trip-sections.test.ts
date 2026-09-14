import { expect, test } from 'vitest';
import {
  isTripSection,
  tripSectionDescriptions,
  tripSectionLabels,
  tripSections
} from './trip-sections';

test('recognizes every trip subpath and rejects unknown sections', () => {
  for (const section of tripSections) expect(isTripSection(section)).toBe(true);
  expect(isTripSection('unknown')).toBe(false);
  expect(isTripSection('')).toBe(false);
  expect(isTripSection('ideas')).toBe(true);
  expect(isTripSection('issues')).toBe(true);
  expect(isTripSection('versions')).toBe(false);
});

test('exposes labels and descriptions for every trip section', () => {
  for (const section of tripSections) {
    expect(tripSectionLabels[section].length).toBeGreaterThan(0);
    expect(tripSectionDescriptions[section].length).toBeGreaterThan(0);
  }
  expect(tripSectionLabels.overview).toBe('Overview');
  expect(tripSectionLabels.issues).toBe('Issues');
  expect(tripSectionLabels.ideas).toBe('Ideas');
});
