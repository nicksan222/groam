import type { GenericCtx } from '@convex-dev/better-auth';
import type { DataModel } from '#convex-generated/dataModel';
import { createAuth } from '#convex/modules/auth/auth';

// Better Auth Local Install requires a static instance for schema generation.
// Runtime requests always receive a real Convex context through createAuth.
export const auth = createAuth({} as GenericCtx<DataModel>);
