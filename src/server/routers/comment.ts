// src/server/routers/comment.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { notify } from '@/server/utils/notify'

// Minimal presentational selection (avoid heavy includes in callers)
const commentSelect = {
  id: true,
  postId: true,
  text: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      profile: { select: { displayName: true, handle: true, avatarUrl: true } },
    },
  },
} as const

function shapeComment(c: any) {
  return {
    id: c.id as string,
    postId: c.postId as string,
    text: c.text as string,
    createdAt: c.createdAt as Date,
    author: {
      userId: c.author?.id as string,
      displayName: c.author?.profile?.displayName ?? null,
      handle: c.author?.profile?.handle ?? null,
      avatarUrl: c.author?.profile?.avatarUrl ?? null,
    },
  }
}

function extractHandles(txt: string): string[] {
  const out = new Set<string>()
  const re = /@([A-Za-z0-9._-]{2,30})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(txt))) out.add(m[1])
  return [...out]
}

export const commentRouter = router({
  // Matches client usage: utils.comment.list.useInfiniteQuery(...)
  list: publicProcedure
    .input(
      z.object({
        postId: z.string(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().nullish(), // Comment.id
      })
    )
    .query(async ({ input }) => {
      const take = input.limit + 1

      const rows = await prisma.comment.findMany({
        where: { postId: input.postId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: commentSelect,
      })

      let nextCursor: string | undefined
      if (rows.length > input.limit) {
        const next = rows.pop()!
        nextCursor = next.id
      }

      return { items: rows.map(shapeComment), nextCursor }
    }),

  // Matches client usage: utils.comment.create.useMutation(...)
  create: protectedProcedure
    .input(z.object({ postId: z.string(), text: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 1) Create the comment
      const created = await prisma.comment.create({
        data: { postId: input.postId, authorUserId: userId, text: input.text.trim() },
        select: commentSelect,
      })
      const shaped = shapeComment(created)

      // 2) Find post author's userId (may be direct field or via relation)
      const post = await prisma.post.findUnique({
        where: { id: input.postId },
        select: { author: { select: { userId: true } } },
      })
      const postAuthorUserId = (post as any)?.author?.userId ?? null

      // 3) Notify post author (if not self)
      if (postAuthorUserId && postAuthorUserId !== userId) {
        await notify(postAuthorUserId, {
          type: 'COMMENT',
          title: 'New comment on your post',
          body: input.text.slice(0, 180),
          contextType: 'POST',
          contextId: input.postId,
          actorUserId: userId,
          data: { commentId: created.id },
        })
      }

      // 4) Notify @mentions (handles -> profiles -> userIds), excluding self and post author
      const handles = extractHandles(input.text)
      if (handles.length) {
        const profiles = await prisma.profile.findMany({
          where: { handle: { in: handles } },
          select: { userId: true },
        })
        const mentionUserIds = Array.from(
          new Set(
            profiles
              .map((p) => p.userId)
              .filter((uid): uid is string => !!uid && uid !== userId && uid !== postAuthorUserId)
          )
        )
        if (mentionUserIds.length) {
          await Promise.all(
            mentionUserIds.map((uid) =>
              notify(uid, {
                type: 'MENTION',
                title: 'You were mentioned in a comment',
                body: input.text.slice(0, 180),
                contextType: 'POST',
                contextId: input.postId,
                actorUserId: userId,
                data: { commentId: created.id },
              })
            )
          )
        }
      }

      return shaped
    }),

  // Legacy alias to support older clients calling `comment.add`
  add: protectedProcedure
    .input(z.object({ postId: z.string(), text: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 1) Create the comment
      const created = await prisma.comment.create({
        data: { postId: input.postId, authorUserId: userId, text: input.text.trim() },
        select: commentSelect,
      })
      const shaped = shapeComment(created)

      // 2) Find post author's userId (may be direct field or via relation)
      const post = await prisma.post.findUnique({
        where: { id: input.postId },
        select: { author: { select: { userId: true } } },
      })
      const postAuthorUserId = (post as any)?.author?.userId ?? null

      // 3) Notify post author (if not self)
      if (postAuthorUserId && postAuthorUserId !== userId) {
        await notify(postAuthorUserId, {
          type: 'COMMENT',
          title: 'New comment on your post',
          body: input.text.slice(0, 180),
          contextType: 'POST',
          contextId: input.postId,
          actorUserId: userId,
          data: { commentId: created.id },
        })
      }

      // 4) Notify @mentions (handles -> profiles -> userIds), excluding self and post author
      const handles = extractHandles(input.text)
      if (handles.length) {
        const profiles = await prisma.profile.findMany({
          where: { handle: { in: handles } },
          select: { userId: true },
        })
        const mentionUserIds = Array.from(
          new Set(
            profiles
              .map((p) => p.userId)
              .filter((uid): uid is string => !!uid && uid !== userId && uid !== postAuthorUserId)
          )
        )
        if (mentionUserIds.length) {
          await Promise.all(
            mentionUserIds.map((uid) =>
              notify(uid, {
                type: 'MENTION',
                title: 'You were mentioned in a comment',
                body: input.text.slice(0, 180),
                contextType: 'POST',
                contextId: input.postId,
                actorUserId: userId,
                data: { commentId: created.id },
              })
            )
          )
        }
      }

      return shaped
    }),
})

export type CommentRouter = typeof commentRouter