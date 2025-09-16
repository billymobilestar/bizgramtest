// src/server/utils/notifier.ts
import { EventEmitter } from 'events'
import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

/**
 * Fixes in this version:
 * - TS typing for global bus via `declare global` (no `globalThis.__notifyBus` errors)
 * - `url` is stored inside Notification.data (your Prisma Notification model does not have a `url` column)
 * - Optional `actorUserId` and arbitrary `data` passthrough supported
 * - Safe EventEmitter reuse across hot-reloads
 */

// Augment the Node global to carry our in-process event bus
declare global {
  // eslint-disable-next-line no-var
  var __notifyBus: EventEmitter | undefined
}

type NotifyInput = {
  userId: string
  type:
    | 'MESSAGE'
    | 'MENTION'
    | 'FOLLOW'
    | 'CALLSHEET_PUBLISHED'
    | 'CALLTIME_CHANGED'
    | 'SCHEDULE_UPDATED'
    | 'PROJECT'
    | 'SYSTEM'
  level?: 'INFO' | 'ACTIONABLE' | 'CRITICAL'
  title: string
  body?: string | null
  /** Stored under data.url (Notification has no `url` column) */
  url?: string | null
  contextType?: string | null
  contextId?: string | null
  /** Optional: who triggered this notification */
  actorUserId?: string | null
  /** Optional: additional payload merged into Notification.data */
  data?: Record<string, unknown> | null
}

// Reuse a single EventEmitter instance across dev hot reloads
const bus = globalThis.__notifyBus ?? new EventEmitter()
if (!globalThis.__notifyBus) {
  globalThis.__notifyBus = bus
}
// Optional: raise listener cap to avoid MaxListeners warnings in dev
bus.setMaxListeners?.(100)

// Ensure values are JSON-serializable and typed for Prisma
function toJsonValue(v: unknown): Prisma.InputJsonValue {
  // JSON round-trip guarantees plain data (no Dates/Maps/Functions)
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
}

export async function notify(input: NotifyInput) {
  const payloadData: Prisma.InputJsonValue | undefined =
    input.data != null
      ? toJsonValue(input.data)
      : input.url != null
      ? toJsonValue({ url: input.url })
      : undefined

  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as any, // keep loose to avoid enum drift while integrating
      level: (input.level ?? 'INFO') as any,
      title: input.title,
      body: input.body ?? null,
      contextType: input.contextType ?? null,
      contextId: input.contextId ?? null,
      actorUserId: input.actorUserId ?? null,
      ...(payloadData !== undefined ? { data: payloadData } : {}),
    },
  })

  bus.emit(`user:${row.userId}`, { kind: 'new', row })
  return row
}

// Simple subscribe for SSE or websockets adapters
export function onUser(userId: string, cb: (payload: any) => void) {
  const ch = `user:${userId}`
  bus.on(ch, cb)
  return () => {
    bus.off(ch, cb)
  }
}