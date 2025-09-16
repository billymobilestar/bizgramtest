// src/server/routers/brief.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'

const CreateBriefInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  budgetMin: z.number().int().optional(),
  budgetMax: z.number().int().optional(),
  currency: z.string().default('CAD'),
  city: z.string().optional(),
  region: z.string().optional(),
})

export const briefRouter = router({
  create: protectedProcedure.input(CreateBriefInput).mutation(async ({ ctx, input }) => {
    return prisma.brief.create({
      data: {
        createdByUserId: ctx.userId!,
        title: input.title,
        description: input.description,
        budgetMin: input.budgetMin ?? null,
        budgetMax: input.budgetMax ?? null,
        currency: input.currency,
        city: input.city ?? null,
        region: input.region ?? null,
      },
    })
  }),

  myBriefs: protectedProcedure.query(({ ctx }) => {
    return prisma.brief.findMany({
      where: { createdByUserId: ctx.userId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, createdAt: true,
        proposals: { select: { id: true } }
      },
    })
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const b = await prisma.brief.findUnique({
      where: { id: input.id },
      include: {
        targets: { include: { profile: { select: { id:true, handle:true, displayName:true } } } },
        proposals: { include: { profile: { select: { id:true, handle:true, displayName:true } } } },
      },
    })
    if (!b || b.createdByUserId !== ctx.userId!) {
      // allow non-owner to view only if they are a creator with a profile invited here
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me || !b?.targets.some(t => t.profileId === me.id)) throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return b
  }),

  inviteByHandle: protectedProcedure
    .input(z.object({ briefId: z.string(), handle: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const b = await prisma.brief.findUnique({ where: { id: input.briefId } })
      if (!b || b.createdByUserId !== ctx.userId!) throw new TRPCError({ code: 'FORBIDDEN' })
      const p = await prisma.profile.findUnique({ where: { handle: input.handle.toLowerCase() } })
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' })
      await prisma.briefTarget.upsert({
        where: { briefId_profileId: { briefId: b.id, profileId: p.id } },
        update: { invited: true },
        create: { briefId: b.id, profileId: p.id, invited: true },
      })
      return { ok: true }
    }),

  submitProposal: protectedProcedure
    .input(z.object({ briefId: z.string(), message: z.string().min(1).max(2000), price: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
      if (!me) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No profile' })
      // must be invited OR allow open submissions if you want; we enforce invited
      const invited = await prisma.briefTarget.findUnique({
        where: { briefId_profileId: { briefId: input.briefId, profileId: me.id } },
      })
      if (!invited) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not invited' })
      return prisma.proposal.create({
        data: {
          briefId: input.briefId,
          profileId: me.id,
          message: input.message,
          price: input.price ?? null,
        },
      })
    }),

  setProposalStatus: protectedProcedure
    .input(z.object({ proposalId: z.string(), status: z.enum(['submitted','accepted','declined']) }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.proposal.findUnique({ where: { id: input.proposalId } })
      if (!p) throw new TRPCError({ code: 'NOT_FOUND' })
      const b = await prisma.brief.findUnique({ where: { id: p.briefId } })
      if (!b || b.createdByUserId !== ctx.userId!) throw new TRPCError({ code: 'FORBIDDEN' })
      const updated = await prisma.proposal.update({ where: { id: p.id }, data: { status: input.status } })
      if (input.status === 'accepted') {
        await prisma.brief.update({ where: { id: b.id }, data: { status: 'closed' } })
      }
      return updated
    }),
})
