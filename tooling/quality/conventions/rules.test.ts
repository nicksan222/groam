import { describe, expect, test } from 'vite-plus/test';
import { loadDefinitions, toRule } from './definitions';
import { memoryRepository } from './repository';

// Every definition is tested by its own examples; adding a rule needs no test code.
describe.each(loadDefinitions().map((definition) => [definition.name, definition] as const))(
  '%s',
  (_, definition) => {
    const rule = toRule(definition);

    test('has an example that reports', () => {
      expect(definition.examples.some((example) => example.reports.length > 0)).toBe(true);
    });

    test.each(definition.examples.map((example, index) => [index + 1, example] as const))(
      'example %i',
      (__, example) => {
        expect(rule.check(memoryRepository(example.files))).toEqual(example.reports);
      }
    );
  }
);
