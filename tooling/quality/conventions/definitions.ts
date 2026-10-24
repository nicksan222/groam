import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { type Definition, runHarness } from './harnesses';
import type { Rule } from './repository';

/** A rule definition file: a harness, its settings, and examples that test it. */
export type RuleDefinition = Definition & {
  name: string;
  message: string;
  examples: { files: Record<string, string>; reports: string[] }[];
};

const directory = join(import.meta.dirname, 'rules');
const schema = z.fromJSONSchema(
  JSON.parse(readFileSync(join(import.meta.dirname, 'rule.schema.json'), 'utf8')) as Parameters<
    typeof z.fromJSONSchema
  >[0]
);

/** Every rule in rules/*.json, validated against rule.schema.json. */
export function loadDefinitions(): RuleDefinition[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const parsed = schema.safeParse(JSON.parse(readFileSync(join(directory, file), 'utf8')));
      if (!parsed.success)
        throw new Error(
          `rules/${file} does not match rule.schema.json:\n${z.prettifyError(parsed.error)}`
        );
      // The schema guarantees the shape; the file name is the rule name.
      return { ...(parsed.data as object), name: file.slice(0, -'.json'.length) } as RuleDefinition;
    });
}

export const toRule = (definition: RuleDefinition): Rule => ({
  name: definition.name,
  message: definition.message,
  check: (repository) => runHarness(definition, repository)
});
