import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { z } from 'zod'
import { prisma } from '@/server/utils/prisma'

const pageInput = z.object({
  cursor: z.string().nullish(),
  limit: z.number().min(1).max(50).default(12),
})

export const opinionsRouter = router({
  // Create
  create: protectedProcedure
    .input(z.object({
      kind: z.enum(['TEXT','PHOTO','POLL']),
      text: z.string().optional(),
      assets: z.array(z.object({ url: z.string().url(), altText: z.string().optional(), order: z.number().optional() })).optional(),
      pollOptions: z.array(z.string().min(1)).optional(),
      pollEndsAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const op = await prisma.opinion.create({
        data: {
          authorUserId: ctx.userId,   // stored, never exposed
          kind: input.kind,
          text: input.text ?? null,
          assets: input.assets?.length ? {
            create: input.assets.map((a, i) => ({ url: a.url, altText: a.altText ?? null, order: a.order ?? i }))
          } : undefined,
          pollOptions: input.pollOptions?.length ? {
            create: input.pollOptions.map(label => ({ label }))
          } : undefined,
          pollEndsAt: input.pollEndsAt ? new Date(input.pollEndsAt) : null,
        },
        select: { id: true, createdAt: true }, // minimal
      })
      return op
    }),

  // Feeds
  listNew: publicProcedure.input(pageInput).query(async ({ input }) => {
    const limit = input.limit
    const items = await prisma.opinion.findMany({
      where: { removed: false },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: selectPublicOpinion(),
    })
    return pageOut(items, limit)
  }),

  listTrending: publicProcedure.input(pageInput).query(async ({ input }) => {
    const limit = input.limit
    const items = await prisma.opinion.findMany({
      where: { removed: false },
      orderBy: { scoreTrend: 'desc' },
      take: limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: selectPublicOpinion(),
    })
    return pageOut(items, limit)
  }),

  listHot: publicProcedure.input(pageInput).query(async ({ input }) => {
    const limit = input.limit
    const items = await prisma.opinion.findMany({
      where: { removed: false },
      orderBy: { scoreHot: 'desc' },
      take: limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: selectPublicOpinion(),
    })
    return pageOut(items, limit)
  }),

  // React (like)
  react: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { id } = input
    await prisma.opinionReaction.upsert({
      where: { opinionId_userId_kind: { opinionId: id, userId: ctx.userId, kind: 'like' } },
      create: { opinionId: id, userId: ctx.userId, kind: 'like' },
      update: {},
    })
    await prisma.opinion.update({
      where: { id }, data: { reactionCount: { increment: 1 } }
    }).catch(() => {})
    return { ok: true }
  }),

  // Comment (anonymous)
  comment: protectedProcedure.input(z.object({ id: z.string(), text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.opinionComment.create({
        data: { opinionId: input.id, text: input.text, authorUserId: ctx.userId }
      })
      await prisma.opinion.update({
        where: { id: input.id }, data: { commentCount: { increment: 1 } }
      }).catch(() => {})
      return { ok: true }
    }),

  // Poll vote (anonymous)
  vote: protectedProcedure.input(z.object({ id: z.string(), optionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.opinionVote.create({
        data: { opinionId: input.id, optionId: input.optionId, voterUserId: ctx.userId }
      })
      await prisma.opinionPollOption.update({
        where: { id: input.optionId }, data: { count: { increment: 1 } }
      }).catch(() => {})
      await prisma.opinion.update({
        where: { id: input.id }, data: { voteCount: { increment: 1 } }
      }).catch(() => {})
      return { ok: true }
    }),
})

// Helpers
function selectPublicOpinion() {
  return {
    id: true, createdAt: true, kind: true, text: true,
    reactionCount: true, commentCount: true, voteCount: true,
    assets: { select: { url: true, altText: true, order: true } },
    pollOptions: { select: { id: true, label: true, count: true } },
  }
}
function pageOut(items: any[], limit: number) {
  let nextCursor: string | null = null
  if (items.length > limit) {
    const next = items.pop()
    nextCursor = next.id
  }
  return { items, nextCursor }
}