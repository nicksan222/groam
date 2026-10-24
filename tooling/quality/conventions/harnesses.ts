import { basename, dirname, join, matchesGlob } from 'node:path';
import type { Repository } from './repository';

/** The fields every definition shares; see rule.schema.json for each harness's own. */
export type Scope = { include?: string[]; exclude?: string[] };
export type Exception = { within: string; pattern: string };
type Manifest = {
  name: string;
  dependencies?: Record<string, string>;
  exports?: Record<string, string | Record<string, string>>;
};

export type Definition = Scope &
  (
    | {
        harness: 'path-names';
        target: 'directories' | 'files';
        pattern: string;
        exceptions?: Exception[];
      }
    | { harness: 'forbidden-files' }
    | { harness: 'companion-files'; requires: string[] }
    | { harness: 'mentioned-in'; token: string; files: string[] }
    | {
        harness: 'referenced-elsewhere';
        aliases: Record<string, string>;
        manifests?: string[];
        searchIn: string[];
        ignore?: string[];
      }
    | {
        harness: 'pattern';
        pattern: string;
        ignoreCase?: boolean;
        ignoreComments?: boolean;
        onlyIfFileMatches?: string;
        report?: 'lines' | 'first' | 'file';
      }
    | { harness: 'only-allowed-content'; allowed: string }
    | { harness: 'max-matches'; pattern: string; max: number }
    | { harness: 'dependency-boundaries'; allowed: Record<string, string[]> }
    | { harness: 'export-targets' }
  );

const inScope =
  ({ include, exclude = [] }: Scope) =>
  (path: string) =>
    (!include || include.some((glob) => matchesGlob(path, glob))) &&
    !exclude.some((glob) => matchesGlob(path, glob));

const withoutExtension = (path: string) => path.replace(/\.[^./]+$/u, '');

/** Fills {path}, {dir}, {base}, {name} (optionally `:camel`) for `path`. */
function fill(template: string, path: string): string {
  const values = {
    path,
    dir: dirname(path),
    base: withoutExtension(path),
    name: withoutExtension(basename(path))
  };
  return template.replace(
    /\{(path|dir|base|name)(:camel)?\}/gu,
    (_, key: keyof typeof values, camel?: string) =>
      camel
        ? values[key].replace(/-([a-z0-9])/gu, (__, letter: string) => letter.toUpperCase())
        : values[key]
  );
}

/** Source with comments blanked out, so line numbers still match. */
function withoutComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/gu, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, blank)
    .replace(
      /(^|[^:])\/\/.*$/gmu,
      (match, prefix: string) => prefix + blank(match.slice(prefix.length))
    );
}

const lineAt = (source: string, offset: number) => source.slice(0, offset).split('\n').length;

function pathNames(
  definition: Extract<Definition, { harness: 'path-names' }>,
  { files }: Repository
): string[] {
  const pattern = new RegExp(definition.pattern, 'u');
  const exceptions = (definition.exceptions ?? []).map((e) => ({
    ...e,
    pattern: new RegExp(e.pattern, 'u')
  }));
  const scoped = inScope(definition);
  const valid = (path: string, name: string) =>
    pattern.test(name) ||
    exceptions.some((e) => matchesGlob(path, e.within) && e.pattern.test(name));
  if (definition.target === 'files')
    return files.filter((file) => scoped(file) && !valid(file, withoutExtension(basename(file))));
  const directories = new Set(
    files.flatMap((file) => {
      const parts = file.split('/').slice(0, -1);
      return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
    })
  );
  return [...directories].filter((path) => scoped(path) && !valid(path, basename(path))).sort();
}

function patternMatches(
  definition: Extract<Definition, { harness: 'pattern' }>,
  { files, read }: Repository
): string[] {
  const pattern = new RegExp(definition.pattern, `gmu${definition.ignoreCase ? 'i' : ''}`);
  const onlyIf = definition.onlyIfFileMatches
    ? new RegExp(definition.onlyIfFileMatches, 'mu')
    : null;
  return files.filter(inScope(definition)).flatMap((file) => {
    const raw = read(file);
    if (onlyIf && !onlyIf.test(raw)) return [];
    const source = definition.ignoreComments ? withoutComments(raw) : raw;
    const lines = [
      ...new Set([...source.matchAll(pattern)].map((match) => lineAt(source, match.index)))
    ];
    if (lines.length === 0) return [];
    if (definition.report === 'file') return [file];
    return (definition.report === 'first' ? lines.slice(0, 1) : lines).map(
      (line) => `${file}:${line}`
    );
  });
}

const importSpecifier = /(?:\bfrom|\bimport)\s*\(?\s*(['"])([^'"\n]+)\1/gu;
const resolvable = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/** `<package name>/<export key>` -> file, so package imports resolve the way consumers write them. */
function exportedFiles(manifestPaths: string[], read: Repository['read']): Map<string, string> {
  const exported = new Map<string, string>();
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(read(manifestPath)) as Manifest;
    for (const [key, target] of Object.entries(manifest.exports ?? {})) {
      const path = typeof target === 'string' ? target : (target.import ?? target.default);
      if (path && !path.includes('*'))
        exported.set(`${manifest.name}/${key.slice(2)}`, join(dirname(manifestPath), path));
    }
  }
  return exported;
}

type ImportScope = {
  aliases: Record<string, string>;
  exported: Map<string, string>;
  universe: Set<string>;
};

/** The file an import specifier in `file` points at, when it is one of `universe`. */
function resolveImport(
  specifier: string,
  file: string,
  { aliases, exported, universe }: ImportScope
): string | undefined {
  const aliased = Object.entries(aliases).find(([prefix]) => specifier.startsWith(prefix));
  const base = specifier.startsWith('.')
    ? join(dirname(file), specifier)
    : (exported.get(specifier) ??
      (aliased ? join(aliased[1], specifier.slice(aliased[0].length)) : undefined));
  return base
    ? resolvable.map((suffix) => base + suffix).find((path) => universe.has(path))
    : undefined;
}

/**
 * Files in scope that no live code imports. Imports are resolved (relative paths, package exports,
 * `aliases` prefixes) so a same-named file elsewhere or a mere mention does not count. Files
 * outside the scope that import a scoped file are live; scoped files are live only when a live
 * file imports them, so components that only import each other are reported.
 */
function unreachable(
  definition: Extract<Definition, { harness: 'referenced-elsewhere' }>,
  { files, read }: Repository,
  scoped: string[]
): string[] {
  const universe = new Set(
    files.filter(inScope({ include: definition.searchIn, exclude: definition.ignore }))
  );
  for (const file of scoped) universe.add(file);
  const exported = exportedFiles(definition.manifests ?? [], read);
  const importsOf = (file: string): string[] =>
    [...withoutComments(read(file)).matchAll(importSpecifier)].flatMap((match) => {
      const found = resolveImport(match[2] ?? '', file, {
        aliases: definition.aliases,
        exported,
        universe
      });
      return found ? [found] : [];
    });
  const candidates = new Set(scoped);
  const live = new Set<string>();
  const queue = [...universe].filter((file) => !candidates.has(file));
  const seen = new Set(queue);
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    for (const target of importsOf(file)) {
      if (candidates.has(target)) live.add(target);
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return scoped.filter((file) => !live.has(file));
}

function manifests({ files, read }: Repository, scope: Scope) {
  return files
    .filter(inScope(scope))
    .map((file) => ({ file, manifest: JSON.parse(read(file)) as Manifest }));
}

/** Runs one definition against the repository and returns a location per violation. */
export function runHarness(definition: Definition, repository: Repository): string[] {
  const { files, read, exists } = repository;
  const scoped = files.filter(inScope(definition));
  switch (definition.harness) {
    case 'path-names':
      return pathNames(definition, repository);
    case 'forbidden-files':
      return scoped;
    case 'companion-files':
      return scoped.filter(
        (file) => !definition.requires.some((template) => exists(fill(template, file)))
      );
    case 'mentioned-in':
      return scoped.flatMap((file) =>
        definition.files
          .filter((target) => !read(target).includes(fill(definition.token, file)))
          .map((target) => `${file} -> ${target}`)
      );
    case 'referenced-elsewhere':
      return unreachable(definition, repository, scoped);
    case 'pattern':
      return patternMatches(definition, repository);
    case 'only-allowed-content': {
      const allowed = new RegExp(definition.allowed, 'gmu');
      return scoped.filter(
        (file) => withoutComments(read(file)).replace(allowed, '').trim() !== ''
      );
    }
    case 'max-matches': {
      const pattern = new RegExp(definition.pattern, 'gmu');
      return scoped.flatMap((file) => {
        const names = [...read(file).matchAll(pattern)].map(
          (match) => match.slice(1).find(Boolean) ?? match[0]
        );
        return names.length > definition.max ? [`${file}: ${names.join(', ')}`] : [];
      });
    }
    case 'dependency-boundaries':
      return manifests(repository, definition).flatMap(({ manifest }) => {
        const allowed = definition.allowed[manifest.name];
        if (!allowed) return [`${manifest.name} is not in the boundary map`];
        return Object.keys(manifest.dependencies ?? {})
          .filter((name) => name.startsWith('@groam/') && !allowed.includes(name))
          .map((name) => `${manifest.name} -> ${name}`);
      });
    case 'export-targets':
      return manifests(repository, definition).flatMap(({ file, manifest }) =>
        Object.entries(manifest.exports ?? {}).flatMap(([key, target]) => {
          const path = typeof target === 'string' ? target : (target.import ?? target.default);
          if (!path || path.includes('*')) return [];
          return exists(join(dirname(file), path)) ? [] : [`${file} ${key} -> ${path}`];
        })
      );
  }
}
