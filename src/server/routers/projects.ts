// src/server/routers/projects.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'

const dateStr = z.string().datetime().nullable().optional()

const membersInclude = {
  orderBy: { createdAt: 'asc' as const },
  include: {
    profile: {
      select: {
        id: true,
        handle: true,
        displayName: true,
        profession: true,
        user: { select: { email: true } },
      },
    },
  },
}

export const projectsRouter = router({
  // List my projects (for /projects)
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return prisma.project.findMany({
      where: { ownerUserId: ctx.userId! },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, details: true },
    })
  }),

  // Create a new blank project
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.project.create({
        data: { ownerUserId: ctx.userId!, name: input.name.trim() },
      })
      return { id: row.id }
    }),

  // Delete a project (and its crew)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({ where: { id: input.id } })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      await prisma.projectMember.deleteMany({ where: { projectId: p.id } })
      await prisma.project.delete({ where: { id: p.id } })
      return { ok: true }
    }),

  // Fetch one project + members
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({
        where: { id: input.id },
        include: { members: membersInclude },
      })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      return p
    }),

  // Save high-level metadata (returns fresh project)
  updateMeta: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(120),
      shootDate: dateStr,
      crewCall: dateStr,
      shootCall: dateStr,
      details: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({ where: { id: input.id } })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      const toDate = (s?: string | null) => (s ? new Date(s) : null)
      await prisma.project.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          shootDate: toDate(input.shootDate ?? null),
          crewCall: toDate(input.crewCall ?? null),
          shootCall: toDate(input.shootCall ?? null),
          details: input.details ?? undefined,
        },
      })
      return prisma.project.findUnique({
        where: { id: input.id },
        include: { members: membersInclude },
      })
    }),

  // Add many app users from profileIds (prefill role/email/externalName). Returns fresh project.
  addMembers: protectedProcedure
    .input(z.object({ id: z.string(), profileIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({ where: { id: input.id } })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })

      const existing = await prisma.projectMember.findMany({
        where: { projectId: input.id, profileId: { in: input.profileIds } },
        select: { profileId: true },
      })
      const existingSet = new Set(existing.map(e => e.profileId!))

      const profs = await prisma.profile.findMany({
        where: { id: { in: input.profileIds } },
        select: {
          id: true,
          displayName: true,
          profession: true,
          user: { select: { email: true } },
        },
      })

      const toCreate = profs
        .filter(pr => !existingSet.has(pr.id))
        .map(pr => ({
          projectId: input.id,
          profileId: pr.id,
          externalName: pr.displayName || null,  // handy for PDF/UI fallback
          role: pr.profession || null,
          department: null,
          email: pr.user?.email ?? null,
          phone: null,
        }))

      if (toCreate.length) await prisma.projectMember.createMany({ data: toCreate })

      return prisma.project.findUnique({
        where: { id: input.id },
        include: { members: membersInclude },
      })
    }),

  // Add an external (manual) person. Returns fresh project.
  addManualMember: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.string().optional(),
      department: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({ where: { id: input.id } })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      await prisma.projectMember.create({
        data: {
          projectId: input.id,
          externalName: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          role: input.role ?? null,
          department: input.department ?? null,
        },
      })
      return prisma.project.findUnique({
        where: { id: input.id },
        include: { members: membersInclude },
      })
    }),

  // Inline edit a crew member. Returns fresh project.
  updateMember: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      memberId: z.string(),
      patch: z.object({
        role: z.string().optional(),
        department: z.string().optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        callTime: dateStr,
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({ where: { id: input.projectId } })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      await prisma.projectMember.update({
        where: { id: input.memberId },
        data: {
          role: input.patch.role ?? undefined,
          department: input.patch.department ?? undefined,
          email: input.patch.email ?? undefined,
          phone: input.patch.phone ?? undefined,
          callTime: input.patch.callTime ? new Date(input.patch.callTime) : undefined,
        },
      })
      return prisma.project.findUnique({
        where: { id: input.projectId },
        include: { members: membersInclude },
      })
    }),

  // Set cover image URL stored in Project.details JSON
  setCover: protectedProcedure
    .input(z.object({ id: z.string(), coverUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const p = await prisma.project.findUnique({
        where: { id: input.id },
        select: { ownerUserId: true, details: true },
      })
      if (!p || p.ownerUserId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      const nextDetails = { ...(p.details as any ?? {}), coverUrl: input.coverUrl }
      await prisma.project.update({
        where: { id: input.id },
        data: { details: nextDetails },
      })
      return { id: input.id, coverUrl: input.coverUrl }
    }),
})