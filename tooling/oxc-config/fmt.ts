import type { UserConfig } from 'vite-plus';

type FmtConfig = NonNullable<UserConfig['fmt']>;

// Formatting policy for `vp fmt` / `vp check` (Oxfmt).
export const fmt = {
  endOfLine: 'lf',
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'none',
  sortImports: { newlinesBetween: false, partitionByNewline: true },
  // syncpack owns package.json ordering (`bun run format`).
  sortPackageJson: false,
  ignorePatterns: [
    // Biome formatted only code, JSON, CSS, and HTML.
    '**/*.{md,mdx,toml,yaml,yml}',
    '**/_generated/**',
    '**/generated.ts',
    '**/routeTree.gen.ts',
    '**/vendor/**',
    '.claude/**'
  ]
} satisfies FmtConfig;
