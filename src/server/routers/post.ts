import { prisma } from '@/server/utils/prisma'
import { ensureDbUser } from '@/server/utils/ensureDbUser'
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'

// Reusable author projection
const authorSelect = {
  id: true,
  userId: true,
  handle: true,
  displayName: true,
  profession: true,
  city: true,
  region: true,
  avatarUrl: true,
} satisfies Prisma.ProfileSelect

// Inputs
const FileInput = z.object({
  url: z.string().url(),
  altText: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
})

const CreateInput = z.object({
  caption: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().min(1)).max(10).default([]),
  files: z.array(FileInput).min(1).max(10),
})

// Helpers
async function ensureProfileFor(userId: string) {
  // Satisfy FK: make sure the parent `User` row exists first (no-op if no `User` model)
  await ensureDbUser(userId)

  let prof = await prisma.profile.findUnique({ where: { userId } })
  if (!prof) {
    const base = `user_${userId.slice(0, 6)}`
    let handle = base
    for (let i = 1; i <= 100; i++) {
      const exists = await prisma.profile.findUnique({ where: { handle } })
      if (!exists) break
      handle = `${base}${i}`
    }
    prof = await prisma.profile.create({
      data: { userId, handle, displayName: handle, profession: 'Creator' },
    })
  }
  return prof
}

async function createPostImpl(userId: string, input: z.infer<typeof CreateInput>) {
  const prof = await ensureProfileFor(userId)
  const post = await prisma.post.create({
    data: {
      authorProfileId: prof.id,
      caption: input.caption ?? null,
      tags: input.tags,
      assets: {
        create: input.files.map((f) => ({
          url: f.url,
          altText: f.altText ?? null,
          order: f.order ?? 0,
        })),
      },
    },
    include: {
      assets: { orderBy: [{ order: 'asc' as const }] },
      author: { select: authorSelect },
    },
  })
  return post
}

// Router
export const postRouter = router({
  // Create a post immediately (files are already uploaded & public URLs provided)
  create: protectedProcedure
    .input(CreateInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
      return createPostImpl(ctx.userId, input)
    }),

  // Same as create for now (kept for API compatibility)
  createDraft: protectedProcedure
    .input(CreateInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
      return createPostImpl(ctx.userId, input)
    }),

  // Current user's posts (for /account/posts)
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId
    if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return []

    const posts = await prisma.post.findMany({
      where: { authorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: { assets: true }, // ← important for thumbnails
     /* include: {
        assets: { orderBy: [{ order: 'asc' as const }] },
      },*/
    })
    return posts
  }),

  // Like/unlike a post, return new state + count
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const key = { userId_postId: { userId, postId: input.postId } }
      const existing = await prisma.like.findUnique({ where: key })
      if (existing) {
        await prisma.like.delete({ where: key })
      } else {
        await prisma.like.create({ data: { userId, postId: input.postId } })
      }

      const likeCount = await prisma.like.count({ where: { postId: input.postId } })
      return { liked: !existing, likeCount }
    }),

  // Full post for modal (public)
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const post = await prisma.post.findUnique({
        where: { id: input.id },
        include: {
          author: { select: authorSelect },
          assets: { orderBy: [{ order: 'asc' as const }] },
        },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })

      const [likeCount, commentCount, myLike] = await Promise.all([
        prisma.like.count({ where: { postId: input.id } }),
        prisma.comment
          .count({ where: { postId: input.id } })
          .catch(() => 0), // if Comment table exists, count; else zero
        ctx.userId
          ? prisma.like
              .findUnique({
                where: { userId_postId: { userId: ctx.userId, postId: input.id } },
                select: { postId: true },
              })
              .then(Boolean)
          : Promise.resolve(false),
      ])

      return { ...post, likeCount, commentCount, myLike }
    }),
})
