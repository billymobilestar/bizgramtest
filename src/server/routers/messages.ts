// src/server/routers/messages.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'
import { notify } from '@/server/utils/notifier'

async function getOrCreateThread(userA: string, userB: string) {
  const found = await prisma.thread.findFirst({
    where: { participantIds: { hasEvery: [userA, userB] } },
  })
  if (found) return found
  return prisma.thread.create({ data: { participantIds: [userA, userB] } })
}

function firstNameFromDisplayName(name?: string | null) {
  if (!name) return ''
  return name.trim().split(/\s+/)[0] || ''
}

function personalize(template: string, p: { displayName: string | null; handle: string }) {
  const firstName = firstNameFromDisplayName(p.displayName) || p.handle
  return template
    .replaceAll('{{name}}', firstName)      // allows “Hey {{name}}…”
    .replaceAll('{firstName}', firstName)   // also supports {firstName}
    .replaceAll('{displayName}', p.displayName ?? '')
    .replaceAll('{handle}', p.handle)
}

// Compact author shape for cards in DMs
const authorSelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
} as const

export const messagesRouter = router({
  /** Send a plain text message in a thread */
  send: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        text: z.string().trim().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await prisma.thread.findUnique({ where: { id: input.threadId } })
      if (!thread) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!thread.participantIds.includes(ctx.userId!)) throw new TRPCError({ code: 'FORBIDDEN' })

      const me = await prisma.profile.findUnique({
        where: { userId: ctx.userId! },
        select: { displayName: true, handle: true },
      })

      await prisma.message.create({
        data: { threadId: input.threadId, fromUserId: ctx.userId!, text: input.text },
      })
      await prisma.thread.update({
        where: { id: input.threadId },
        data: { lastMessageAt: new Date() },
      })

      // Notify the other participant(s)
      const fromName = me?.displayName || (me?.handle ? `@${me.handle}` : 'Someone')
      const snippet = input.text.length > 140 ? input.text.slice(0, 140) + '…' : input.text
      const recipients = thread.participantIds.filter((uid) => uid !== ctx.userId!)
      for (const uid of recipients) {
        await notify({
          userId: uid,
          type: 'MESSAGE',
          level: 'ACTIONABLE',
          title: `New message from ${fromName}`,
          body: snippet,
          url: `/messages/${thread.id}`,
          contextType: 'thread',
          contextId: thread.id,
        })
      }

      return { ok: true }
    }),

  /** Share a post to one or more profiles (creates or reuses a thread). */
  sharePost: protectedProcedure
    .input(z.object({ postId: z.string(), targetProfileIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({
        where: { userId: ctx.userId! },
        select: { id: true, displayName: true, handle: true },
      })
      if (!me) throw new Error('No profile')

      const results: string[] = []
      for (const pid of input.targetProfileIds) {
        const target = await prisma.profile.findUnique({
          where: { id: pid },
          select: { userId: true },
        })
        if (!target?.userId) continue

        const thread = await getOrCreateThread(ctx.userId!, target.userId)

        // canonical structured payload understood by list()
        const payload = JSON.stringify({ type: 'post', postId: input.postId })
        await prisma.message.create({
          data: { threadId: thread.id, fromUserId: ctx.userId!, text: payload },
        })
        await prisma.thread.update({
          where: { id: thread.id },
          data: { lastMessageAt: new Date() },
        })

        // Notify target about the shared post
        const fromName = me?.displayName || (me?.handle ? `@${me.handle}` : 'Someone')
        if (target?.userId && target.userId !== ctx.userId) {
          await notify({
            userId: target.userId,
            type: 'MESSAGE',
            level: 'ACTIONABLE',
            title: `${fromName} shared a post with you`,
            body: null,
            url: `/messages/${thread.id}`,
            contextType: 'thread',
            contextId: thread.id,
          })
        }

        results.push(thread.id)
      }

      return { ok: true, threads: results }
    }),


bulkSendToProfiles: protectedProcedure
  .input(
    z.object({
      profileIds: z.array(z.string()).min(1),
      text: z.string().min(1).max(2000),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const me = await prisma.profile.findUnique({
      where: { userId: ctx.userId! },
      select: { displayName: true, handle: true },
    })
    if (!me) throw new TRPCError({ code: 'FORBIDDEN', message: 'No profile' })

    // Get target profiles → userIds for threads
    const targets = await prisma.profile.findMany({
      where: { id: { in: input.profileIds } },
      select: { id: true, userId: true, handle: true, displayName: true },
    })

    const results: { profileId: string; threadId: string; messageId: string }[] = []

    for (const tp of targets) {
      if (!tp.userId) continue // skip if not a full user
      const thread =
        (await prisma.thread.findFirst({
          where: { participantIds: { hasEvery: [ctx.userId!, tp.userId] } },
        })) ||
        (await prisma.thread.create({ data: { participantIds: [ctx.userId!, tp.userId] } }))

      const text = personalize(input.text, { displayName: tp.displayName, handle: tp.handle })

      const msg = await prisma.message.create({
        data: { threadId: thread.id, fromUserId: ctx.userId!, text },
      })

      await prisma.thread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() },
      })

      // Notify recipient about the bulk message
      const fromName = me?.displayName || (me?.handle ? `@${me.handle}` : 'Someone')
      const snippet = text.length > 140 ? text.slice(0, 140) + '…' : text
      await notify({
        userId: tp.userId,
        type: 'MESSAGE',
        level: 'ACTIONABLE',
        title: `New message from ${fromName}`,
        body: snippet,
        url: `/messages/${thread.id}`,
        contextType: 'thread',
        contextId: thread.id,
      })

      results.push({ profileId: tp.id, threadId: thread.id, messageId: msg.id })
    }

    return { ok: true, count: results.length, results }
  }),


  /** List messages for a thread, expanding shared posts into rich objects. */
  list: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await prisma.thread.findUnique({ where: { id: input.threadId } })
      if (!thread) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!thread.participantIds.includes(ctx.userId!)) throw new TRPCError({ code: 'FORBIDDEN' })

      const messages = await prisma.message.findMany({
        where: { threadId: input.threadId },
        orderBy: { createdAt: 'asc' },
      })

      // parse any JSON text payloads
      const parsed = messages.map((m) => {
        try {
          const j = JSON.parse(m.text)
          return { ...m, parsed: j }
        } catch {
          return { ...m, parsed: null as any }
        }
      })

      // batch-load referenced posts
      const postIds = Array.from(
        new Set(
          parsed
            .map((m) => (m.parsed?.type === 'post' ? String(m.parsed.postId) : null))
            .filter(Boolean) as string[]
        )
      )

      const posts = postIds.length
        ? await prisma.post.findMany({
            where: { id: { in: postIds } },
            include: {
              author: { select: authorSelect },
              assets: { orderBy: { order: 'asc' as const }, take: 1 },
            },
          })
        : []

      const byId = new Map(posts.map((p) => [p.id, p]))

      const items = parsed.map((m) => {
        if (m.parsed?.type === 'post' && byId.has(m.parsed.postId)) {
          return {
            id: m.id,
            createdAt: m.createdAt,
            fromUserId: m.fromUserId,
            kind: 'post' as const,
            post: byId.get(m.parsed.postId)!,
          }
        }
        return {
          id: m.id,
          createdAt: m.createdAt,
          fromUserId: m.fromUserId,
          kind: 'text' as const,
          text: m.text,
        }
      })

      return { items }
    }),

  /** Threads list for /messages */
  listThreads: protectedProcedure.query(async ({ ctx }) => {
    const myId = ctx.userId!

    const threads = await prisma.thread.findMany({
      where: { participantIds: { has: myId } },
      orderBy: { lastMessageAt: 'desc' },
    })

    const rows = await Promise.all(
      threads.map(async (t) => {
        const last = await prisma.message.findFirst({
          where: { threadId: t.id },
          orderBy: { createdAt: 'desc' },
        })

        const otherUserId = t.participantIds.find((id) => id !== myId) || myId
        const other = await prisma.profile.findFirst({
          where: { userId: otherUserId },
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        })

        let preview = ''
        if (last?.text) {
          try {
            const j = JSON.parse(last.text)
            preview = j?.type === 'post' ? 'Shared a post' : last.text
          } catch {
            preview = last.text
          }
        }

        return {
          id: t.id,
          other,
          lastMessageAt: t.lastMessageAt ?? last?.createdAt ?? new Date(0),
          preview,
        }
      })
    )

    rows.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
    return { threads: rows }
  }),
})
