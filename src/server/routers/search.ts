// src/server/routers/search.ts
import { z } from 'zod'
import { router, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'

const authorSelect = {
  id: true,
  handle: true,
  displayName: true,
  profession: true,
  city: true,
  region: true,
  avatarUrl: true,
}

export const searchRouter = router({
  // ── Profiles search ───────────────────────────────────────────────────────────
  profiles: publicProcedure
    .input(
      z.object({
        q: z.string().trim().optional(),
        profession: z.string().trim().optional(),
        city: z.string().trim().optional(),
        region: z.string().trim().optional(),
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: any = {}

      if (input.q) {
        where.OR = [
          { displayName: { contains: input.q, mode: 'insensitive' } },
          { handle: { contains: input.q, mode: 'insensitive' } },
          {professions: { has: input.profession! } },// exact tag match in array
          { city: { contains: input.q, mode: 'insensitive' } },
          { region: { contains: input.q, mode: 'insensitive' } },
        ]
      }
      if (input.profession) where.profession = { contains: input.profession, mode: 'insensitive' }
      if (input.city) where.city = { contains: input.city, mode: 'insensitive' }
      if (input.region) where.region = { contains: input.region, mode: 'insensitive' }

      const items = await prisma.profile.findMany({
        where,
        select: {
          id: true,
          handle: true,
          displayName: true,
          profession: true,
          city: true,
          region: true,
          avatarUrl: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })

      let nextCursor: string | null = null
      if (items.length > input.limit) nextCursor = items.pop()!.id

      return { items, nextCursor }
    }),

  // ── Posts search / discover ───────────────────────────────────────────────────
  posts: publicProcedure
    .input(
      z.object({
        q: z.string().trim().optional(),
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(12),
      }),
    )
    .query(async ({ input }) => {
      const where: any = {}
      if (input.q) {
        where.OR = [
          { caption: { contains: input.q, mode: 'insensitive' } },
          { tags: { has: input.q } },
          // lightweight author searching
          { author: { handle: { contains: input.q, mode: 'insensitive' } } },
          { author: { displayName: { contains: input.q, mode: 'insensitive' } } },
        ]
      }

      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          author: { select: authorSelect },
          assets: { orderBy: { order: 'asc' }, take: 1 },
        },
      })

      let nextCursor: string | null = null
      if (posts.length > input.limit) nextCursor = posts.pop()!.id

      return { items: posts, nextCursor }
    }),
})
