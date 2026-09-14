export type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name: string;
  peerDependencies?: Record<string, string>;
};

const allowedInternalDependencies = {
  '@groam/ai-contracts': new Set<string>(),
  '@groam/auth': new Set(['@groam/env']),
  '@groam/backend': new Set(['@groam/ai-contracts']),
  '@groam/env': new Set<string>(),
  '@groam/ui': new Set(['@groam/ai-contracts', '@groam/backend'])
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
