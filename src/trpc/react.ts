'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

// Client-only tRPC hooks (no @trpc/server in here)
export const api = createTRPCReact<AppRouter>();