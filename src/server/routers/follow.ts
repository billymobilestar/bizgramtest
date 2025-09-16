// src/server/routers/follow.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import type { Profile } from '@prisma/client'

export const followRouter = router({
  toggle: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me) throw new Error('No profile')
      const where = { followerId_followingId: { followerId: me.id, followingId: input.profileId } }

      const exists = await prisma.follow.findUnique({ where })
      if (exists) {
        await prisma.follow.delete({ where })
        return { following: false }
      }
      await prisma.follow.create({ data: { followerId: me.id, followingId: input.profileId } })
      return { following: true }
    }),

  status: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me) return { following: false }
      const exists = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me.id, followingId: input.profileId } },
      })
      return { following: !!exists }
    }),

  counts: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ input }) => {
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followingId: input.profileId } }),
        prisma.follow.count({ where: { followerId: input.profileId } }),
      ])
      return { followers, following }
    }),

  listFollowing: protectedProcedure.query(async ({ ctx }) => {
    const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
    if (!me) throw new Error('No profile')

    const rows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followingId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!rows.length) return []

    const ids = rows.map(r => r.followingId)
    const profiles = await prisma.profile.findMany({
      where: { id: { in: ids } },
      select: { id: true, handle: true, displayName: true, avatarUrl: true },
    })
    const byId = new Map(profiles.map(p => [p.id, p]))
    const ordered = rows
      .map(r => byId.get(r.followingId))
      .filter((p): p is Profile => Boolean(p))

    return ordered
  }),
})
