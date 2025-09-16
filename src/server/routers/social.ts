// src/server/routers/social.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'
import { notify } from '@/server/utils/notifier'

export const socialRouter = router({
  toggleFollow: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me) throw new TRPCError({ code: 'NOT_FOUND' })
      if (me.id === input.profileId) throw new TRPCError({ code: 'BAD_REQUEST' })

      const key = { followerId_followingId: { followerId: me.id, followingId: input.profileId } }
      const existing = await prisma.follow.findUnique({ where: key }).catch(() => null)

      if (existing) {
        await prisma.follow.delete({ where: key })
        return { following: false }
      }

      // create follow
      await prisma.follow.create({ data: { followerId: me.id, followingId: input.profileId } })

      // notify the person who was followed (if they have a user account)
      const followed = await prisma.profile.findUnique({
        where: { id: input.profileId },
        select: { id: true, userId: true },
      })

      if (followed?.userId) {
        const followerName = (me as any).displayName ?? 'Someone'
        const followerHandle = (me as any).handle as string | undefined

        await notify({
          userId: followed.userId,
          type: 'FOLLOW',
          level: 'ACTIONABLE',
          title: `${followerName} followed you`,
          body: followerHandle ? `@${followerHandle}` : null,
          url: followerHandle ? `/@${followerHandle}` : null,
          contextType: 'profile',
          contextId: me.id,
        })
      }

      return { following: true }
    }),

  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = { userId_postId: { userId: ctx.userId!, postId: input.postId } }
      const existing = await prisma.like.findUnique({ where: key }).catch(() => null)
      if (existing) {
        await prisma.like.delete({ where: key })
        return { liked: false }
      }
      await prisma.like.create({ data: { userId: ctx.userId!, postId: input.postId } })
      return { liked: true }
    }),
})