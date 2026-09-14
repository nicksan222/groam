import { createApi } from '@convex-dev/better-auth';
import { createAuthOptions } from '#convex/modules/auth/auth';
import schema from './schema';

export const { create, deleteMany, deleteOne, findMany, findOne, updateMany, updateOne } =
  createApi(schema, createAuthOptions);
