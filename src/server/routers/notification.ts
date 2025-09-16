// src/server/routers/notification.ts
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@/server/utils/prisma'
import { router, protectedProcedure } from '@/server/trpc'
import type { Notification, NotificationLevel, NotificationType } from '@prisma/client'

/**
 * Unified bell feed: merges (A) Notification rows and (B) message-derived items
 * (unread threads based on ThreadRead). Cursor spans both via createdAt+id.
 */

type BellSource = 'notification' | 'message'

type NotificationBellItem = Pick<
  Notification,
  | 'id'
  | 'type'
  | 'level'
  | 'title'
  | 'body'
  | 'isRead'
  | 'readAt'
  | 'createdAt'
  | 'contextType'
  | 'contextId'
  | 'actorUserId'
  | 'data'
> & { source: 'notification' }

type MessageBellItem = {
  id: string // e.g., "msg:<threadId>:<messageId>"
  type: NotificationType // "MESSAGE"
  level: NotificationLevel // "ACTIONABLE"
  title: string | null
  body: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
  contextType: string | null // "THREAD"
  contextId: string | null // threadId
  actorUserId: string | null // last sender
  data: Record<string, unknown> | null // { threadId, messageId }
  source: 'message'
}

type BellItem = NotificationBellItem | MessageBellItem

function encodeCursor(d: Date, id: string, source: BellSource) {
  return Buffer.from(JSON.stringify({ d: d.toISOString(), id, s: source })).toString('base64')
}
function decodeCursor(c: string): { createdAt: Date; id: string; source: BellSource } {
  const o = JSON.parse(Buffer.from(c, 'base64').toString('utf8')) as { d: string; id: string; s: BellSource }
  return { createdAt: new Date(o.d), id: o.id, source: o.s }
}

/**
 * Safely derive message bell items for unread threads.
 * - If Thread/Message/ThreadRead models are absent or differ, we quietly return []
 * - Assumes Thread has lastMessageAt (or falls back to updatedAt)
 */
async function deriveMessageBellItems(userId: string, limit: number): Promise<MessageBellItem[]> {
  const p: any = prisma as any
  if (!p.thread || !p.message || !p.threadRead) return []

  try {
    const threads = await p.thread.findMany({
      where: { participantIds: { has: userId } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: Math.min(limit, 50),
      select: { id: true, lastMessageAt: true, updatedAt: true },
    })

    if (!threads?.length) return []

    const threadIds = threads.map((t: any) => t.id)
    const reads: Array<{ threadId: string; readAt: Date }> = await p.threadRead.findMany({
      where: { userId, threadId: { in: threadIds } },
      select: { threadId: true, readAt: true },
    })
    const readMap = new Map(reads.map((r) => [r.threadId, r.readAt]))

    const items: MessageBellItem[] = []
    for (const t of threads) {
      const lastAt: Date = (t.lastMessageAt as Date) ?? (t.updatedAt as Date)
      const readAt = readMap.get(t.id)
      if (readAt && lastAt <= readAt) continue // nothing new

      const lastMsg = await p.message.findFirst({
        where: { threadId: t.id, ...(readAt ? { createdAt: { gt: readAt } } : {}) },
        orderBy: { createdAt: 'desc' },
        select: { id: true, text: true, createdAt: true, fromUserId: true },
      })
      if (!lastMsg) continue

      items.push({
        id: `msg:${t.id}:${lastMsg.id}`,
        type: 'MESSAGE' as NotificationType,
        level: 'ACTIONABLE' as NotificationLevel,
        title: 'New message',
        body: (lastMsg.text ?? '').slice(0, 180),
        isRead: false,
        readAt: null,
        createdAt: lastMsg.createdAt as Date,
        contextType: 'THREAD',
        contextId: t.id,
        actorUserId: lastMsg.fromUserId ?? null,
        data: { threadId: t.id, messageId: lastMsg.id },
        source: 'message',
      })
    }

    return items
  } catch {
    // If schema differs, just degrade silently
    return []
  }
}

export const notificationRouter = router({
  // Unified bell: merge Notification rows + derived message items
  listMine: protectedProcedure
    .input(
      z
        .object({
          unreadOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().nullish(), // base64 cursor spanning both sources
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const limit = input?.limit ?? 20
      const unreadOnly = input?.unreadOnly ?? false

      // --- Notifications side ---
      const notifWhere: any = {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      }

      let cursorFilter: any = undefined
      if (input?.cursor) {
        const cur = decodeCursor(input.cursor)
        if (cur.source === 'notification') {
          cursorFilter = {
            OR: [
              { createdAt: { lt: cur.createdAt } },
              { createdAt: cur.createdAt, id: { lt: cur.id } },
            ],
          }
        }
      }

      const notifRows = await prisma.notification.findMany({
        where: { ...notifWhere, ...(cursorFilter ?? {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit, // we’ll merge with messages, then page
      })

      const notifItems: NotificationBellItem[] = notifRows.map((n) => ({
        id: n.id,
        type: n.type,
        level: n.level,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
        contextType: n.contextType,
        contextId: n.contextId,
        actorUserId: n.actorUserId,
        data: n.data as any,
        source: 'notification',
      }))

      // --- Messages side ---
      const messageItemsRaw = await deriveMessageBellItems(userId, limit * 2)
      let messageItems = messageItemsRaw
      if (input?.cursor) {
        const cur = decodeCursor(input.cursor)
        messageItems = messageItemsRaw.filter((m) => {
          if (m.createdAt < cur.createdAt) return true
          if (m.createdAt > cur.createdAt) return false
          return m.id < cur.id
        })
      }

      // --- Merge, sort, slice
      const mergedAll: BellItem[] = [...notifItems, ...messageItems].sort((a, b) => {
        if (a.createdAt.getTime() !== b.createdAt.getTime()) {
          return b.createdAt.getTime() - a.createdAt.getTime()
        }
        return b.id.localeCompare(a.id)
      })

      const page = mergedAll.slice(0, limit)
      const last = page[page.length - 1]
      const nextCursor = mergedAll.length > limit && last ? encodeCursor(last.createdAt, last.id, last.source) : null

      return { items: page, nextCursor }
    }),

  // Lightweight badge endpoint for the bell (includes derived messages)
  unseenCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!
    const [notifCount, latest, msgItems] = await Promise.all([
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      deriveMessageBellItems(userId, 50),
    ])

    const messageUnseen = msgItems.length // one per thread w/ new messages
    return { count: notifCount + messageUnseen, latestAt: latest?.createdAt ?? null }
  }),

  // Mark one as read
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.notification.findUnique({ where: { id: input.id } })
      if (!row || row.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      await prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      })
      return { ok: true }
    }),

  // Mark all as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.userId!, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return { ok: true }
  }),

  // Mark everything in a given context (e.g., a project) as read
  markContextRead: protectedProcedure
    .input(z.object({ contextType: z.string(), contextId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: {
          userId: ctx.userId!,
          contextType: input.contextType,
          contextId: input.contextId,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      })
      return { ok: true }
    }),

  // Preferences
  getPrefs: protectedProcedure.query(async ({ ctx }) => {
    const pref = await prisma.notificationPref.findUnique({
      where: { userId: ctx.userId! },
    })
    return (
      pref ?? {
        userId: ctx.userId!,
        emailEnabled: true,
        digest: 'off',
        quietStart: null,
        quietEnd: null,
        categories: {},
        updatedAt: new Date(),
      }
    )
  }),

  setPrefs: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        digest: z.enum(['off', 'daily', 'weekly']).optional(),
        quietStart: z.string().nullable().optional(),
        quietEnd: z.string().nullable().optional(),
        categories: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.notificationPref.upsert({
        where: { userId: ctx.userId! },
        create: { userId: ctx.userId!, ...input, updatedAt: new Date() },
        update: { ...input, updatedAt: new Date() },
      })
      return { ok: true }
    }),

  // Mute/unmute a context (e.g., a project)
  setMute: protectedProcedure
    .input(
      z.object({
        contextType: z.string(),
        contextId: z.string(),
        until: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.notificationMute.upsert({
        where: {
          userId_contextType_contextId: {
            userId: ctx.userId!,
            contextType: input.contextType,
            contextId: input.contextId,
          },
        },
        create: {
          userId: ctx.userId!,
          contextType: input.contextType,
          contextId: input.contextId,
          until: input.until ?? null,
        },
        update: { until: input.until ?? null },
      })
      return { ok: true }
    }),

  removeMute: protectedProcedure
    .input(z.object({ contextType: z.string(), contextId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notificationMute
        .delete({
          where: {
            userId_contextType_contextId: {
              userId: ctx.userId!,
              contextType: input.contextType,
              contextId: input.contextId,
            },
          },
        })
        .catch(() => null)
      return { ok: true }
    }),
})