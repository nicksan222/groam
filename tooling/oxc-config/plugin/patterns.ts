import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineRule, type ESTree, type Rule } from 'vite-plus/lint/plugins';
import { z } from 'zod';

/** A `patterns/<name>.json` rule definition (see pattern.schema.json). */
export type PatternDefinition = {
  name: string;
  match: 'module-source' | 'node-text';
  nodes?: string[];
  pattern: string;
  message: string;
  files: string[];
  excludeFiles?: string[];
  examples: { file: string; source: string; reports: boolean }[];
};

type ModuleWithSource =
  | ESTree.ImportDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ExportAllDeclaration;

const directory = join(import.meta.dirname, 'patterns');
const schema = z.fromJSONSchema(
  JSON.parse(readFileSync(join(import.meta.dirname, 'pattern.schema.json'), 'utf8')) as Parameters<
    typeof z.fromJSONSchema
  >[0]
);

/** Every rule in patterns/*.json, validated against pattern.schema.json. */
export const patternDefinitions: PatternDefinition[] = readdirSync(directory)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    const parsed = schema.safeParse(JSON.parse(readFileSync(join(directory, file), 'utf8')));
    if (!parsed.success)
      throw new Error(
        `plugin/patterns/${file} does not match pattern.schema.json:\n${z.prettifyError(parsed.error)}`
      );
    // The schema guarantees the shape; the file name is the rule name.
    return {
      ...(parsed.data as object),
      name: file.slice(0, -'.json'.length)
    } as PatternDefinition;
  });

function patternRule({ match, nodes = [], pattern, message }: PatternDefinition): Rule {
  const whole = new RegExp(`^(?:${pattern})$`, 'su');
  return defineRule({
    meta: { type: 'problem' },
    create(context) {
      if (match === 'module-source') {
        const check = (node: ModuleWithSource) => {
          if (node.source && whole.test(String(node.source.value)))
            context.report({ node: node.source, message });
        };
        return {
          ExportAllDeclaration: check,
          ExportNamedDeclaration: check,
          ImportDeclaration: check
        };
      }
      const check = (node: ESTree.Node) => {
        if (whole.test(context.sourceCode.getText(node))) context.report({ node, message });
      };
      return Object.fromEntries(nodes.map((kind) => [kind, check]));
    }
  });
}

/** The pattern rules, keyed by name, for the plugin. */
export const patternRules: Record<string, Rule> = Object.fromEntries(
  patternDefinitions.map((definition) => [definition.name, patternRule(definition)])
);

/** One Oxlint override per pattern rule, enabling it in its scope. */
export const patternOverrides = patternDefinitions.map(({ name, files, excludeFiles }) => ({
  files,
  ...(excludeFiles ? { excludeFiles } : {}),
  rules: { [`groam/${name}`]: 'error' as const }
}));
