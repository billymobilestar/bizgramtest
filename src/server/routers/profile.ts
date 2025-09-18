// src/server/routers/profile.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { ensureDbUser } from '@/server/utils/ensureDbUser'

const profileSelect = {
  id: true,
  userId: true,
  handle: true,
  displayName: true,
  profession: true,          // legacy single
  professions: true,         // ✅ new
  accountType: true,         // ✅ new
  portfolioUrl: true,        // ✅ new
  bio: true,
  city: true,
  region: true,
  servicesEnabled: true,
  acceptsBriefs: true,
  acceptsDMs: true,
  showCityPublicly: true,
  showRatesPublicly: true,
  currentWorkCity: true,
  currentWorkUntil: true,
  verificationLevel: true,
  createdAt: true,
  updatedAt: true,
  avatarUrl: true,
}

export const profileRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const p = await prisma.profile.findUnique({
      where: { userId: ctx.userId! },
      select: profileSelect,
    })
    return p
  }),

getByHandle: publicProcedure
  .input(z.object({ handle: z.string() }))
  .query(async ({ input }) => {
    return prisma.profile.findUnique({
      where: { handle: input.handle },
      select: profileSelect,
    })
  }),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1),
        handle: z.string().min(3),
        professions: z.array(z.string().min(1)).max(10).default([]),
        bio: z.string().max(280).optional().nullable(),
        city: z.string().optional().nullable(),
        region: z.string().optional().nullable(),
        servicesEnabled: z.boolean().default(true),
        acceptsBriefs: z.boolean().default(false),
        acceptsDMs: z.boolean().default(true),
        showCityPublicly: z.boolean().default(true),
        showRatesPublicly: z.boolean().default(false),
        currentWorkCity: z.string().optional().nullable(),
        currentWorkUntil: z.string().datetime().optional().nullable(),
        accountType: z.enum(['PERSONAL', 'COMPANY']),
        portfolioUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Make sure the parent DB `User` row exists (satisfy FK)
      await ensureDbUser(ctx.userId!)

      const primary = input.professions?.[0] ?? null
      const cleanHandle = input.handle.trim()

      const data = {
        displayName: input.displayName,
        handle: cleanHandle,
        profession: primary ?? ('' as any), // legacy single
        professions: input.professions ?? [],
        bio: input.bio ?? null,
        city: input.city ?? null,
        region: input.region ?? null,
        servicesEnabled: input.servicesEnabled,
        acceptsBriefs: input.acceptsBriefs,
        acceptsDMs: input.acceptsDMs,
        showCityPublicly: input.showCityPublicly,
        showRatesPublicly: input.showRatesPublicly,
        currentWorkCity: input.currentWorkCity ?? null,
        currentWorkUntil: input.currentWorkUntil ? new Date(input.currentWorkUntil) : null,
        accountType: input.accountType,
        portfolioUrl: input.portfolioUrl ?? null,
      }

      const updated = await prisma.profile.upsert({
        where: { userId: ctx.userId! },
        update: data,
        create: { userId: ctx.userId!, ...data },
        select: profileSelect,
      })

      return updated
    }),
})