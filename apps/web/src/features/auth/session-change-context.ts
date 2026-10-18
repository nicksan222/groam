import { createContext } from 'react';
import type { ChangeSession } from '@/types/account-security';

/** Outside the app shell a session change is just the request; the shell also pauses the workspace. */
export const SessionChangeContext = createContext<ChangeSession>((request) => request());
