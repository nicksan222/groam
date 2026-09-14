# Devkit

`@groam/devkit` contains tested process helpers shared by more than one local workflow:

- configure local Better Auth and optional AI deployment variables;
- resolve the repository toolchain, paths, ports, and origins;
- run Convex commands consistently;
- identify and stop the repository's local Convex backend process;
- probe and wait for the local backend or complete development stack.

It does not own developer commands. Put human workflows in the root `Justfile` and package lifecycle
commands in the package that performs them. Add a devkit export only when multiple owners reuse the
behavior; otherwise keep the implementation beside its sole consumer.

`prepare-convex.ts` is the root development lifecycle entrypoint. The backend
package owns the Turbo `dev` task; no separate Convex tooling workspace is
needed.
