// src/server/routers/feed.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import type { Prisma } from '@prisma/client'

/** Shared selects/includes */
const authorSelect = {
  id: true,
  userId: true,
  handle: true,
  displayName: true,
  profession: true,
  city: true,
  region: true,
  avatarUrl: true,
} as const

const postInclude: Prisma.PostInclude = {
  author: { select: authorSelect },
  assets: { orderBy: { order: 'asc' }, take: 1 }, // note: not a readonly array
}

async function requireMyProfileId(userId: string) {
  const p = await prisma.profile.findUnique({ where: { userId } })
  if (!p) throw new Error('No profile for user')
  return p.id
}

async function likeCountMapFor(postIds: string[]) {
  if (!postIds.length) return new Map<string, number>()
  const grouped = await prisma.like.groupBy({
    by: ['postId'],
    where: { postId: { in: postIds } },
    _count: { postId: true },
  })
  return new Map(grouped.map(g => [g.postId, g._count.postId]))
}

export const feedRouter = router({
  /** Home feed: you + people you follow */
  home: protectedProcedure
    .input(z.object({ cursor: z.string().nullish(), limit: z.number().int().min(1).max(50).default(15) }))
    .query(async ({ ctx, input }) => {
      const myProfileId = await requireMyProfileId(ctx.userId!)
      const following = await prisma.follow.findMany({
        where: { followerId: myProfileId },
        select: { followingId: true },
      })
      const authorIds = [myProfileId, ...following.map(f => f.followingId)]
      const items = await prisma.post.findMany({
        where: { authorProfileId: { in: authorIds } },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) {
        const next = items.pop()!
        nextCursor = next.id
      }
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),

  /** Discover baseline: latest from non-followed (or everyone if logged out) */
  /*discover: publicProcedure
    .input(z.object({ cursor: z.string().nullish(), limit: z.number().int().min(1).max(50).default(15) }))
    .query(async ({ ctx, input }) => {
      let where: any = {}
      if (ctx.userId) {
        const myProfileId = await requireMyProfileId(ctx.userId)
        const following = await prisma.follow.findMany({
          where: { followerId: myProfileId },
          select: { followingId: true },
        })
        const excluded = [myProfileId, ...following.map(f => f.followingId)]
        where = { authorProfileId: { notIn: excluded } }
      }
      const items = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) {
        const next = items.pop()!
        nextCursor = next.id
      }
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),
*/
  /** Discover + Search (optional filters). If no filters -> same as discover. */
  discoverSearch: publicProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(15),
        q: z.string().trim().optional(),
        profession: z.string().trim().optional(),
        city: z.string().trim().optional(),
        region: z.string().trim().optional(),
        tags: z.array(z.string()).optional(),
        sort: z.enum(['newest', 'nearby', 'relevance']).default('newest').optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const baseWhere: any = {}
      if (ctx.userId) {
        const myProfileId = await requireMyProfileId(ctx.userId)
        const following = await prisma.follow.findMany({
          where: { followerId: myProfileId },
          select: { followingId: true },
        })
        const excluded = [myProfileId, ...following.map(f => f.followingId)]
        baseWhere.authorProfileId = { notIn: excluded }
      }

      const filters: any = {}
      if (input.q && input.q.length >= 1) {
        const q = input.q
        filters.OR = [
          { caption: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
          { author: { handle: { contains: q, mode: 'insensitive' } } },
          { author: { displayName: { contains: q, mode: 'insensitive' } } },
          { author: { profession: { contains: q, mode: 'insensitive' } } },
          { author: { city: { contains: q, mode: 'insensitive' } } },
          { author: { region: { contains: q, mode: 'insensitive' } } },
        ]
      }
      if (input.profession) filters.author = { ...(filters.author ?? {}), profession: { contains: input.profession, mode: 'insensitive' } }
      if (input.city)       filters.author = { ...(filters.author ?? {}), city: { contains: input.city, mode: 'insensitive' } }
      if (input.region)     filters.author = { ...(filters.author ?? {}), region: { contains: input.region, mode: 'insensitive' } }
      if (input.tags?.length) filters.tags = { hasSome: input.tags }

      const where = { ...baseWhere, ...filters }
      const items = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) {
        const next = items.pop()!
        nextCursor = next.id
      }
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),

  /** Posts by a single author (used for "Mine" tab) */
  byAuthor: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(18),
        media: z.enum(['all', 'images', 'videos']).default('all').optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = { authorProfileId: input.profileId }
      const items = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),

  /** Only posts from people I follow (used for "Following" tab) */
  followingOnly: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(12),
        media: z.enum(['all', 'images', 'videos']).default('all').optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me) return { items: [], nextCursor: null }
      const following = await prisma.follow.findMany({
        where: { followerId: me.id },
        select: { followingId: true },
      })
      const items = await prisma.post.findMany({
        where: { authorProfileId: { in: following.map(f => f.followingId) } },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),

  /** Posts I liked (used for "Liked" tab) */
  likedByMe: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(18),
        media: z.enum(['all', 'images', 'videos']).default('all').optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await prisma.post.findMany({
        where: { likes: { some: { userId: ctx.userId! } } },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: postInclude,
      })
      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id
      const map = await likeCountMapFor(items.map(p => p.id))
      return { items: items.map(p => ({ ...p, likeCount: map.get(p.id) ?? 0 })), nextCursor }
    }),
})
