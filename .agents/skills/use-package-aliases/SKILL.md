---
name: use-package-aliases
description: >-
  Import Groam code through package aliases instead of parent-directory paths.
  Use when adding imports, moving files, or when lint:conventions reports
  parent-imports, ui-imports, ai-imports, route-imports, or halo-imports.
---

# Use package aliases

Parent-directory imports are prohibited; same-folder `./` imports are allowed.
Use kebab-case paths for repository-owned files and folders.

1. Read the owning `package.json` imports/exports and its TypeScript/Vite config
   to discover valid aliases for the file's package and extension.
2. Import across package boundaries through explicit published exports.
   Package-private `#` aliases stay inside their owner; never reach into another
   package's `src/` directory. Add a needed export in its owning manifest.
3. Follow nearby imports for app-local feature/lib paths and public UI, AI,
   backend, and env subpaths. Avoid stale aliases from previous package names.
4. For Void page files under `apps/web/pages/`, read the `route-imports` check under `tooling/quality/`.
   Pages compose feature views and must not import primitives to build product UI.
5. Find current convention and package checks in the root scripts and run them
   after changing import paths or exports.

The source of truth for extension-sensitive aliases is each package manifest;
for import boundaries it is the current checks under `tooling/quality/`.
Do not introduce repository-owned `.mjs` modules.
