// src/server/routers/profile.ts
import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'

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
        // previously 'profession' — now multi
        professions: z.array(z.string().min(1)).max(10).default([]),
        // keep legacy single; we’ll map professions[0] -> profession for now
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
        accountType: z.enum(['PERSONAL', 'COMPANY']),        // ✅ new
        portfolioUrl: z.string().url().optional().nullable() // ✅ new
      })
    )
    .mutation(async ({ ctx, input }) => {
      const primary = input.professions?.[0] ?? null

      const updated = await prisma.profile.update({
        where: { userId: ctx.userId! },
        data: {
          displayName: input.displayName,
          handle: input.handle,
          // keep legacy single for comps still using it
          profession: primary ?? ('' as any),
          // new multi
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
        },
        select: profileSelect,
      })
      return updated
    }),
})


/*import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'


const updateInput = z.object({
displayName: z.string().min(1).max(80),
handle: z.string().min(2).max(30).regex(/^[a-z0-9_]+$/i),
profession: z.string().min(1).max(80),
city: z.string().max(80).nullable().optional(),
region: z.string().max(80).nullable().optional(),
servicesEnabled: z.boolean().optional(),
acceptsBriefs: z.boolean().optional(),
acceptsDMs: z.boolean().optional(),
showCityPublicly: z.boolean().optional(),
showRatesPublicly: z.boolean().optional(),
currentWorkCity: z.string().max(80).nullable().optional(),
currentWorkUntil: z.coerce.date().nullable().optional(),
})


export const profileRouter = router({

    // ➕ add inside export const profileRouter = router({ ... })
me: protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.userId) return null
  return prisma.profile.findUnique({
    where: { userId: ctx.userId! },
    select: {
      id: true,
      userId: true,
      handle: true,
      displayName: true,
      profession: true,
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
      profession: true,
      professions: true,         // ✅ new
  accountType: true,         // ✅ new
  portfolioUrl: true,
    },
  })


}),

getMe: protectedProcedure.query(async ({ ctx }) => {
const p = await prisma.profile.findUnique({ where: { userId: ctx.userId! } })
if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' })
    
return p


}),


update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
try {
const updated = await prisma.profile.update({
where: { userId: ctx.userId! },
data: {
displayName: input.displayName,
handle: input.handle.toLowerCase(),
profession: input.profession,
professions: z.array(z.string().min(1)).max(10).default([]),

city: input.city ?? null,
region: input.region ?? null,
servicesEnabled: input.servicesEnabled ?? undefined,
acceptsBriefs: input.acceptsBriefs ?? undefined,
acceptsDMs: input.acceptsDMs ?? undefined,
showCityPublicly: input.showCityPublicly ?? undefined,
showRatesPublicly: input.showRatesPublicly ?? undefined,
currentWorkCity: input.currentWorkCity ?? null,
currentWorkUntil: input.currentWorkUntil ?? null,
},
})
return updated
} catch (err) {
if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Handle is taken' })
}
throw err
}
}),


getByHandle: publicProcedure
.input(z.object({ handle: z.string().min(2) }))
 .query(async ({ input }) => {
    const p = await prisma.profile.findUnique({ where: { handle: input.handle },select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          profession: true,
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
        }, })
    if (!p) return null
    return p
  }),
})*/