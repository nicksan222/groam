import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

/** The files a convention rule can see, and their contents. */
export type Repository = {
  /** Repository-owned files: tracked or untracked but not ignored, minus generated and vendored ones. */
  files: readonly string[];
  read(path: string): string;
  /** Whether a path exists at all, generated files included. */
  exists(path: string): boolean;
};

/** A repository convention: `check` returns one location per violation. */
export type Rule = {
  name: string;
  /** What to do instead, shown above the locations. */
  message: string;
  check(repository: Repository): string[];
};

const generated = /(?:^|\/)(?:_generated|\.astro|\.void)\//u;
const vendored = /(?:^|\/)vendor\/|^\.(?:agents|claude)\/skills\/impeccable\//u;

const owned = (file: string) => Boolean(file) && !generated.test(file) && !vendored.test(file);

export function gitRepository(): Repository {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter((file) => owned(file) && existsSync(file) && statSync(file).isFile());
  const contents = new Map<string, string>();
  return {
    files,
    exists: existsSync,
    read(path) {
      let source = contents.get(path);
      if (source === undefined) {
        source = readFileSync(path, 'utf8');
        contents.set(path, source);
      }
      return source;
    }
  };
}

/** An in-memory repository for rule tests. */
export function memoryRepository(files: Record<string, string>): Repository {
  return {
    files: Object.keys(files).filter(owned),
    exists: (path) => path in files,
    read(path) {
      const source = files[path];
      if (source === undefined) throw new Error(`${path} is not in the repository`);
      return source;
    }
  };
}
