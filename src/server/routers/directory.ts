// src/server/routers/directory.ts
import { z } from 'zod'
import { router, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'

const Input = z.object({
  q: z.string().optional(),
  accountType: z.enum(['PERSONAL','COMPANY']).optional(),  // "People" vs "Business"
  profession: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  followersMin: z.number().int().min(0).optional(),
  followersMax: z.number().int().min(0).optional(),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(50).default(24),
  sort: z.enum(['relevance','a_z','followers_desc']).default('relevance').optional(),
})

export const directoryRouter = router({
  profiles: publicProcedure
    .input(Input)
    .query(async ({ input }) => {
      // Build Prisma WHERE (use 'any' to be tolerant to schema differences, e.g. professions[])
      const where: any = {}

      if (input.accountType) where.accountType = input.accountType
      if (input.city) where.city = { contains: input.city, mode: 'insensitive' }
      if (input.region) where.region = { contains: input.region, mode: 'insensitive' }

      // Free text across displayName/handle/bio/profession(s)
      if (input.q?.trim()) {
        where.OR = [
          { displayName: { contains: input.q, mode: 'insensitive' } },
          { handle: { contains: input.q, mode: 'insensitive' } },
          { bio: { contains: input.q, mode: 'insensitive' } },
          { profession: { contains: input.q, mode: 'insensitive' } },
          // If you have a Postgres string[] column `professions`, this will work.
          // If not present in your schema, Prisma will ignore at runtime since `where` is any.
          { professions: { has: input.q } },
        ]
      }

      // Profession facet
      if (input.profession?.trim()) {
        where.AND ??= []
        where.AND.push({
          OR: [
            { profession: { contains: input.profession, mode: 'insensitive' } },
            { professions: { has: input.profession } },
          ],
        })
      }

      // Sorting: base order
      let orderBy: any = [{ createdAt: 'desc' as const }]
      if (input.sort === 'a_z') orderBy = [{ displayName: 'asc' as const }]
      // followers_desc handled after we compute counts; we’ll re-order in JS

      const items = await prisma.profile.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy,
        select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          accountType: true,
          profession: true,
          // If you have this as string[]
          professions: true as any,
          city: true,
          region: true,
          avatarUrl: true,
          createdAt: true,
        },
      })

      let nextCursor: string | null = null
      if (items.length > input.limit) {
        const last = items.pop()!
        nextCursor = last.id
      }

      // Batch follower counts for just these results
      const ids = items.map(p => p.id)
      const followerRows = ids.length
        ? await prisma.follow.groupBy({
            by: ['followingId'],
            where: { followingId: { in: ids } },
            _count: { _all: true },
          })
        : []

      const followerMap = new Map<string, number>(
        followerRows.map(r => [r.followingId, r._count._all])
      )

      // Optional follower range filter (done in memory on this page of results)
      let filtered = items
      if (input.followersMin != null || input.followersMax != null) {
        filtered = items.filter(p => {
          const c = followerMap.get(p.id) ?? 0
          if (input.followersMin != null && c < input.followersMin) return false
          if (input.followersMax != null && c > input.followersMax) return false
          return true
        })
      }

      // Optional reorder by followers desc
      if (input.sort === 'followers_desc') {
        filtered = [...filtered].sort(
          (a, b) => (followerMap.get(b.id) ?? 0) - (followerMap.get(a.id) ?? 0)
        )
      }

      return {
        items: filtered.map(p => ({
          ...p,
          professions: (p as any).professions ?? [], // normalize
          followerCount: followerMap.get(p.id) ?? 0,
        })),
        nextCursor,
      }
    }),
})
