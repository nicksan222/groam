---
name: add-env-variable
description: >-
  Add a validated Groam environment variable through @groam/env or the Convex
  defineApp env. Use when introducing a new env var, Vite VITE_* key, seeder
  or tooling setting, or Convex deployment secret — never read process.env or
  import.meta.env in app code.
---

# Add an environment variable

App code imports a typed, validated target. Raw environment access belongs in
`packages/env` and env bootstrap scripts.

1. Inspect `packages/env/src/apps/` and `packages/env/package.json` to find the
   target that owns the consumer. Follow its validator and exported `env` shape.
   For a new target, publish its subpath in the manifest.
2. For Convex runtime values, inspect the env declaration in
   `packages/backend/convex/convex.config.ts` and existing imports from the
   generated server. Do not import the tooling env package into Convex runtime.
3. Trace existing deployment/local configuration before setting a value. Discover
   the current CLI and target-selection procedure from repository scripts and
   installed command help; do not copy a local-mode flag or deployment name.
4. Update the relevant configuration and tests without printing secret values.

Personal ChatGPT OAuth grants are managed by the ChatGPT module, not env vars.
Do not sync developer credentials, introduce provider keys, or add
inference funded by deployment credentials as a fallback.
