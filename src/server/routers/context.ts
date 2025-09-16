// src/server/routers/context.ts
// Thin re-export of the TRPC context used by routers.
//
// NOTE: The symbol was renamed from `createContext` to `createTRPCContext`.
// Importers should reference this module rather than deep paths.

export { createTRPCContext, type Context } from '../context'
