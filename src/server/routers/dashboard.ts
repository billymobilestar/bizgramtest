import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { nanoid } from 'nanoid'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export const dashboardRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      coverUrl: z.string().url().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const base = slugify(input.name) || 'dashboard'
      let slug = base
      let i = 1
      while (await prisma.dashboard.findUnique({ where: { slug } })) {
        slug = `${base}-${++i}`
      }

      const created = await prisma.dashboard.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          slug,
          coverUrl: input.coverUrl ?? null,
          members: {
            create: { userId: ctx.userId, role: 'OWNER' },
          },
        },
        select: { id: true, slug: true },
      })
      return created
    }),

  listMine: protectedProcedure
    .query(async ({ ctx }) => {
      const items = await prisma.dashboard.findMany({
        where: { members: { some: { userId: ctx.userId } } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, coverUrl: true, createdAt: true },
      })
      return items
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const d = await prisma.dashboard.findFirst({
        where: { id: input.id, members: { some: { userId: ctx.userId } } },
        select: {
          id: true, name: true, slug: true, coverUrl: true, createdAt: true,
          callsheets: {
            select: {
              project: { select: { id: true, name: true, createdAt: true } },
              linkedAt: true,
            },
            orderBy: { linkedAt: 'desc' },
          },
        },
      })
      if (!d) throw new Error('Dashboard not found')
      return d
    }),

  updateCover: protectedProcedure
    .input(z.object({ id: z.string(), coverUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      // must be member
      const member = await prisma.dashboardMember.findFirst({
        where: { dashboardId: input.id, userId: ctx.userId },
        select: { id: true },
      })
      if (!member) throw new Error('Forbidden')

      const updated = await prisma.dashboard.update({
        where: { id: input.id },
        data: { coverUrl: input.coverUrl },
        select: { id: true, coverUrl: true },
      })
      return updated
    }),

  linkCallsheet: protectedProcedure
    .input(z.object({ dashboardId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // member check
      const member = await prisma.dashboardMember.findFirst({
        where: { dashboardId: input.dashboardId, userId: ctx.userId },
        select: { id: true },
      })
      if (!member) throw new Error('Forbidden')

      await prisma.dashboardCallsheet.upsert({
        where: { dashboardId_projectId: { dashboardId: input.dashboardId, projectId: input.projectId } },
        create: { dashboardId: input.dashboardId, projectId: input.projectId },
        update: {},
      })
      return { ok: true }
    }),
})