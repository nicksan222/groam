import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';
import { patternDefinitions } from './plugin/patterns.ts';

// Every pattern rule is tested by its own examples; adding one needs no test code.
describe.each(patternDefinitions.map((definition) => [definition.name, definition] as const))(
  'groam/%s',
  (name, { examples }) => {
    test('has examples that report and examples that pass', () => {
      expect(new Set(examples.map((example) => example.reports))).toEqual(new Set([true, false]));
    });

    test.each(examples.map((example, index) => [index + 1, example] as const))(
      'example %i',
      (_, { file, source, reports }) => {
        expect(lintFixture(source, file, `groam(${name})`).status).toBe(reports ? 1 : 0);
      }
    );
  }
);
