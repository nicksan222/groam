import { schemaFor } from '@groam/env/deployment';
import { defineEnv, string } from 'void/env';

// Worker server values. Set production values with `void secret put <NAME>`; local development
// reads apps/web/.env (tooling/devkit/configure-auth.ts writes it).
export default defineEnv(schemaFor('worker', () => string()));
