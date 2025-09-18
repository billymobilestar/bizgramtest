// src/app/api/dev/seed-following/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { bootstrapUser } from '@/server/utils/bootstrapUser'

const IMGS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop',
]

export async function GET() {
const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Make sure current user + profile exists
  await bootstrapUser()
  const me = await prisma.profile.findUnique({ where: { userId } })
  if (!me) return NextResponse.json({ error: 'No profile for user' }, { status: 400 })

  // Create 5 seed creators (if missing), each with 2 posts
  let createdCreators = 0
  let createdPosts = 0
  const seedCount = 5

  for (let i = 1; i <= seedCount; i++) {
    const seedUserId = `seed_${i}`
    const email = `seed_${i}@example.local`
    // upsert a User
    await prisma.user.upsert({
      where: { id: seedUserId },
      update: {},
      create: { id: seedUserId, email },
    })

    // upsert a Profile
    const handleBase = `creator${i}`
    const profile = await prisma.profile.upsert({
      where: { userId: seedUserId },
      update: {},
      create: {
        userId: seedUserId,
        handle: handleBase,
        displayName: `Creator ${i}`,
        profession: i % 2 ? 'Designer' : 'Videographer',
        city: 'Vancouver',
        region: 'BC',
        bio: 'Seed profile for testing',
        avatarUrl: 'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?q=80&w=300&auto=format&fit=crop',
      },
    })
    createdCreators++

    // create a couple of posts if none exist
    const hasPosts = await prisma.post.count({ where: { authorProfileId: profile.id } })
    if (hasPosts === 0) {
      for (let j = 0; j < 2; j++) {
        const p = await prisma.post.create({
          data: {
            authorProfileId: profile.id,
            caption: `Sample post ${j + 1} by ${profile.displayName}`,
            tags: ['sample', 'demo'],
            assets: {
              create: [{ url: IMGS[(i + j) % IMGS.length], order: 0 }],
            },
          },
        })
        if (p) createdPosts++
      }
    }

    // follow from me → seed profile
    const exists = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: profile.id } },
    })
    if (!exists) {
      await prisma.follow.create({
        data: { followerId: me.id, followingId: profile.id },
      })
    }
  }

  // return counts so UI can verify
  const followers = await prisma.follow.count({ where: { followingId: me.id } })
  const following = await prisma.follow.count({ where: { followerId: me.id } })

  return NextResponse.json({
    ok: true,
    createdCreators,
    createdPosts,
    you: me.handle,
    counts: { followers, following },
  })
}
