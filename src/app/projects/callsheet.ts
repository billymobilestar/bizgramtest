import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'

export const callsheetRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return prisma.callsheet.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, projectId: true, day: true, title: true, date: true, createdAt: true },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        day: z.number().int().positive().optional(),
        title: z.string().trim().min(1).optional(),
        date: z.coerce.date().optional(), // accepts 'YYYY-MM-DD'
      })
    )
    .mutation(async ({ input }) => {
      const created = await prisma.callsheet.create({
        data: {
          projectId: input.projectId,
          day: typeof input.day === 'number' ? input.day : null,
          title: input.title ?? null,
          date: input.date ?? null,
        },
        select: { id: true },
      })
      return created
    }),
})