// src/server/routers/saved.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'

type SavedKind = 'POSTS' | 'PEOPLE'  // <- local TS alias; matches Prisma enum

const Kind = z.enum(['PEOPLE', 'POSTS'])
type KindT = z.infer<typeof Kind>


const authorSelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
} as const

async function ensureDefaultList(userId: string, kind: SavedKind) {
  const name = kind === 'POSTS' ? 'Favorites (Posts)' : 'Favorites (People)'
  const existing = await prisma.savedList.findFirst({ where: { userId, kind, name } })
  if (existing) return existing
  return prisma.savedList.create({ data: { userId, kind, name } })
}

export const savedRouter = router({
  /** Lists with counts (optionally filter by kind) */
  myLists: protectedProcedure
    .input(z.object({ kind: Kind }).optional())
    .query(async ({ ctx, input }) => {
      const lists = await prisma.savedList.findMany({
        where: { userId: ctx.userId!, ...(input?.kind ? { kind: input.kind } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { id: true } } },
      })
      return lists.map(l => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        count: l.items.length,
        createdAt: l.createdAt,
      }))
    }),

  /** Create a list with required kind */
  createList: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(60), kind: Kind }))
    .mutation(async ({ ctx, input }) => {
      return prisma.savedList.create({
        data: { userId: ctx.userId!, name: input.name, kind: input.kind },
      })
    }),

  /** Rename a list (no kind changes here) */
  renameList: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.savedList.findUnique({ where: { id: input.id } })
      if (!list || list.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      return prisma.savedList.update({ where: { id: input.id }, data: { name: input.name } })
    }),

  deleteList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.savedList.findUnique({ where: { id: input.id } })
      if (!list || list.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      await prisma.savedItem.deleteMany({ where: { listId: list.id } })
      await prisma.savedList.delete({ where: { id: list.id } })
      return { ok: true }
    }),

  /** Hydrated list detail */
  getList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await prisma.savedList.findUnique({ where: { id: input.id } })
      if (!list || list.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })

      const items = await prisma.savedItem.findMany({
        where: { listId: input.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, postId: true, profileId: true, createdAt: true },
      })

      if (list.kind === 'POSTS') {
        const ids = items.map(i => i.postId).filter(Boolean) as string[]
        const posts = ids.length
          ? await prisma.post.findMany({
              where: { id: { in: ids } },
              include: {
                assets: { orderBy: [{ order: 'asc' }], take: 1 },
                author: { select: authorSelect },
              },
            })
          : []
        const map = new Map(posts.map(p => [p.id, p]))
        return {
          id: list.id, name: list.name, kind: list.kind,
          items: items
            .filter(i => i.postId)
            .map(i => ({ id: i.id, type: 'post' as const, post: map.get(i.postId!), createdAt: i.createdAt })),
        }
      } else {
        const ids = items.map(i => i.profileId).filter(Boolean) as string[]
        const profiles = ids.length
          ? await prisma.profile.findMany({
              where: { id: { in: ids } },
              select: { id: true, handle: true, displayName: true, profession: true, city: true, region: true, avatarUrl: true },
            })
          : []
        const map = new Map(profiles.map(p => [p.id, p]))
        return {
          id: list.id, name: list.name, kind: list.kind,
          items: items
            .filter(i => i.profileId)
            .map(i => ({ id: i.id, type: 'profile' as const, profile: map.get(i.profileId!), createdAt: i.createdAt })),
        }
      }
    }),

  /** Pre-check membership for a target across correct-kind lists */
  membershipForTarget: protectedProcedure
    .input(z.object({ postId: z.string().optional(), profileId: z.string().optional() })
      .refine(v => !!v.postId || !!v.profileId, { message: 'postId or profileId required' }))
    .query(async ({ ctx, input }) => {
      const requiredKind: SavedKind = input.postId ? 'POSTS' : 'PEOPLE'
      const lists = await prisma.savedList.findMany({
        where: { userId: ctx.userId!, kind: requiredKind },
        select: { id: true },
      })
      const listIds = lists.map(l => l.id)
      if (!listIds.length) return { listIds: [] }

      const items = await prisma.savedItem.findMany({
        where: {
          listId: { in: listIds },
          ...(input.postId ? { postId: input.postId } : {}),
          ...(input.profileId ? { profileId: input.profileId } : {}),
        },
        select: { listId: true },
      })
      return { listIds: items.map(i => i.listId) }
    }),

  /** Bulk add to lists (kind-validated, duplicate-safe) */
  addToLists: protectedProcedure
    .input(z.object({
      listIds: z.array(z.string()).min(1),
      postId: z.string().optional(),
      profileId: z.string().optional(),
    }).refine(v => !!v.postId || !!v.profileId, { message: 'postId or profileId required' }))
    .mutation(async ({ ctx, input }) => {
      const lists = await prisma.savedList.findMany({
        where: { id: { in: input.listIds }, userId: ctx.userId! },
        select: { id: true, kind: true },
      })
      if (lists.length !== input.listIds.length) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'One or more lists not found' })
      }
      for (const l of lists) {
        if (input.postId && l.kind !== 'POSTS') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot save a post into a People list' })
        }
        if (input.profileId && l.kind !== 'PEOPLE') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot save a profile into a Posts list' })
        }
      }
      const ops = lists.map(l =>
        prisma.savedItem.upsert({
          where: input.postId
            ? { listId_postId: { listId: l.id, postId: input.postId } }         // <-- correct composite key
            : { listId_profileId: { listId: l.id, profileId: input.profileId! } }, // <-- correct composite key
          update: {},
          create: {
            listId: l.id,
            postId: input.postId ?? null,
            profileId: input.profileId ?? null,
          },
        })
      )
      await prisma.$transaction(ops)
      return { ok: true }
    }),

  /** Convenience single add/remove (kind-safe) */
  addToList: protectedProcedure
    .input(z.object({
      listId: z.string(),
      postId: z.string().optional(),
      profileId: z.string().optional(),
    }).refine(v => !!v.postId || !!v.profileId, { message: 'postId or profileId required' }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.savedList.findUnique({ where: { id: input.listId } })
      if (!list || list.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' })
      if (list.kind === 'POSTS' && !input.postId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This list accepts posts only' })
      if (list.kind === 'PEOPLE' && !input.profileId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This list accepts people only' })
      const exists = await prisma.savedItem.findFirst({
        where: { listId: list.id, postId: input.postId ?? undefined, profileId: input.profileId ?? undefined },
      })
      if (exists) return { ok: true, created: false }
      await prisma.savedItem.create({ data: { listId: list.id, postId: input.postId ?? null, profileId: input.profileId ?? null } })
      return { ok: true, created: true }
    }),

  /** Overview for Saved page */
  listLists: protectedProcedure.query(async ({ ctx }) => {
    const rows = await prisma.savedList.findMany({
      where: { userId: ctx.userId! },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, kind: true, createdAt: true, _count: { select: { items: true } } },
    })
    return rows.map(r => ({ id: r.id, name: r.name, kind: r.kind, count: r._count.items, createdAt: r.createdAt }))
  }),

  listItems: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await prisma.savedList.findFirst({ where: { id: input.listId, userId: ctx.userId! } })
      if (!list) return { profiles: [], posts: [] }

      if (list.kind === 'PEOPLE') {
        const items = await prisma.savedItem.findMany({ where: { listId: list.id, profileId: { not: null } }, select: { profileId: true } })
        const ids = items.map(i => i.profileId!).filter(Boolean)
        const profiles = ids.length
          ? await prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, handle: true, displayName: true, avatarUrl: true } })
          : []
        return { profiles, posts: [] }
      } else {
        const items = await prisma.savedItem.findMany({ where: { listId: list.id, postId: { not: null } }, select: { postId: true } })
        const ids = items.map(i => i.postId!).filter(Boolean)
        const posts = ids.length
          ? await prisma.post.findMany({
              where: { id: { in: ids } },
              include: { author: { select: authorSelect }, assets: { orderBy: [{ order: 'asc' }], take: 1 } },
            })
          : []
        return { profiles: [], posts }
      }
    }),

  /** Kind-aware default toggles */
  togglePostInDefault: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const fav = await ensureDefaultList(ctx.userId!, 'POSTS')
      const existing = await prisma.savedItem.findFirst({ where: { listId: fav.id, postId: input.postId } })
      if (existing) { await prisma.savedItem.delete({ where: { id: existing.id } }); return { saved: false } }
      await prisma.savedItem.create({ data: { listId: fav.id, postId: input.postId } })
      return { saved: true }
    }),

  toggleProfileInDefault: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const fav = await ensureDefaultList(ctx.userId!, 'PEOPLE')
      const existing = await prisma.savedItem.findFirst({ where: { listId: fav.id, profileId: input.profileId } })
      if (existing) { await prisma.savedItem.delete({ where: { id: existing.id } }); return { saved: false } }
      await prisma.savedItem.create({ data: { listId: fav.id, profileId: input.profileId } })
      return { saved: true }
    }),
})
