export type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name: string;
  peerDependencies?: Record<string, string>;
};

const allowedInternalDependencies = {
  // @groam/ai renders through @groam/ui primitives and receives backend
  // function references as injected props, so it never depends on the
  // backend. The backend executes @groam/ai's agent and tool specs: the
  // dependency direction is one-way, backend -> ai. Nothing may rejoin it
  // into a cycle.
  '@groam/ai': new Set(['@groam/icons', '@groam/ui']),
  '@groam/auth': new Set(['@groam/env']),
  // The backend declares its Convex env from @groam/env/deployment, the single definition of
  // what each hosted environment needs; @groam/env has no internal dependencies of its own.
  '@groam/backend': new Set(['@groam/ai', '@groam/env']),
  '@groam/brand': new Set<string>(),
  '@groam/env': new Set<string>(),
  '@groam/icons': new Set<string>(),
  '@groam/ui': new Set(['@groam/brand', '@groam/icons'])
} as const;

/** Returns runtime boundary violations. Tooling and dev-only dependencies are intentionally excluded. */
export function invalidPackageDependencies(manifest: PackageManifest): string[] {
  const allowed =
    allowedInternalDependencies[manifest.name as keyof typeof allowedInternalDependencies];
  if (!allowed) return [`${manifest.name} is missing from the package boundary map`];
  return Object.keys(manifest.dependencies ?? {})
    .filter((dependency) => dependency.startsWith('@groam/') && !allowed.has(dependency))
    .map((dependency) => `${manifest.name} -> ${dependency}`);
}
