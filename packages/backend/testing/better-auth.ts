/// <reference types="vite/client" />

import type { GenericSchema, SchemaDefinition } from 'convex/server';
import type { TestConvex } from 'convex-test';
import schema from '#convex/components/better-auth/schema';

const modules = import.meta.glob('../convex/components/better-auth/**/*.ts');

/**
 * Registers Groam's generated local Better Auth component with convex-test.
 * The package test module targets the base component schema; local installs
 * register their generated plugin schema and component modules instead.
 */
export function registerBetterAuth(
  test: TestConvex<SchemaDefinition<GenericSchema, boolean>>
): void {
  test.registerComponent('betterAuth', schema, modules);
}
