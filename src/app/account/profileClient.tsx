// src/app/account/profileClient.tsx
'use client'

import PostModal from '@/app/components/PostModal'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'
import { Grid, Users, Heart, Bookmark, Settings, Pencil, Filter, ChevronDown } from 'lucide-react'
import PostCard from '@/components/PostCard'

type Tab = 'mine' | 'following' | 'liked' | 'saved'
type Media = 'all' | 'images' | 'videos'

export default function ProfileClient() {
  const utils = api.useUtils()
  const { user } = useUser()

  // ⬇️ modal state for opening a post
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // refresh “me” cache (safe optional chaining for different tRPC versions)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    utils.profile?.me?.invalidate?.().catch(() => {})
  }, [utils])

  const me = api.profile.me.useQuery()

  const counts = api.follow.counts.useQuery(
    me.data ? { profileId: me.data.id } : (undefined as any),
    { enabled: !!me.data?.id }
  )

  const [tab, setTab] = useState<Tab>('mine')
  const [media, setMedia] = useState<Media>('all')
  const [showSort, setShowSort] = useState(false)

  // Prefer Clerk avatar immediately; fall back to DB avatar
  const avatarSrc = user?.imageUrl ?? me.data?.avatarUrl ?? undefined

  // ---- Feeds ----
  const byMe = api.feed.byAuthor.useInfiniteQuery(
    me.data ? { profileId: me.data.id, limit: 18, media } : (undefined as any),
    { enabled: tab === 'mine' && !!me.data?.id, getNextPageParam: (last) => last.nextCursor ?? undefined }
  )

  const following = api.feed.followingOnly.useInfiniteQuery(
    { limit: 24, media },
    { enabled: tab === 'following', getNextPageParam: (last) => last.nextCursor ?? undefined }
  )

  const liked = api.feed.likedByMe.useInfiniteQuery(
    { limit: 18, media },
    { enabled: tab === 'liked', getNextPageParam: (last) => last.nextCursor ?? undefined }
  )

  // ---- Saved lists ----
  const lists = api.saved.myLists.useQuery(undefined, { enabled: tab === 'saved' })
  const [openListId, setOpenListId] = useState<string | null>(null)
  const listItems = api.saved.listItems.useQuery(
    openListId ? { listId: openListId } : (undefined as any),
    { enabled: tab === 'saved' && !!openListId }
  )

  // ---- Slice for 3 / 2 / 3 rows
  const postsMine = (byMe.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 9)
  const postsFollowing = (following.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 6)
  const postsLiked = useMemo(
    () => (liked.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 9),
    [liked.data]
  )

  // ---- Header computed fields ----
  const professionsText = useMemo(() => {
    const d = me.data
    if (!d) return ''
    return (d.professions?.length ? d.professions : [d.profession].filter(Boolean)).join(' • ')
  }, [me.data])

  const locationText = useMemo(() => {
    const d = me.data
    if (!d) return ''
    return [d.city, d.region].filter(Boolean).join(', ')
  }, [me.data])

  const accountTypeLabel = me.data?.accountType === 'COMPANY' ? 'Company' : 'Personal'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-200">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" width={96} height={96} className="object-cover w-full h-full" />
            ) : null}
          </div>

          <div>
            <div className="text-2xl font-semibold">{me.data?.displayName || 'Profile'}</div>
            <div className="text-gray-500">@{me.data?.handle}</div>

            <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
              {professionsText && <span>{professionsText}</span>}
              {locationText && <span>• {locationText}</span>}
              {me.data?.accountType && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                  {accountTypeLabel}
                </span>
              )}
            </div>

            {me.data?.bio && <p className="text-sm text-gray-700 mt-2 max-w-xl">{me.data.bio}</p>}

            {me.data?.portfolioUrl && (
              <a
                href={me.data.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center mt-2 px-3 py-1 rounded-lg border hover:bg-gray-50"
              >
                SHOWREEL
              </a>
            )}

            <div className="flex gap-4 text-sm text-gray-600 mt-2">
              <span><b>{counts.data?.followers ?? 0}</b> followers</span>
              <span><b>{counts.data?.following ?? 0}</b> following</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/account/settings" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
            <Settings size={16} /> <span className="hidden md:inline">Settings</span>
          </Link>
          <Link href="/account/settings" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
            <Pencil size={16} /> <span className="hidden md:inline">Edit</span>
          </Link>
        </div>
      </div>

      {/* Tabs (icons only) */}
      <div className="flex items-center gap-2 border-b pb-2">
        <TabIcon icon={<Grid size={18} />} active={tab === 'mine'} onClick={() => setTab('mine')} title="Your posts" />
        <TabIcon icon={<Users size={18} />} active={tab === 'following'} onClick={() => setTab('following')} title="Following" />
        <TabIcon icon={<Heart size={18} />} active={tab === 'liked'} onClick={() => setTab('liked')} title="Liked" />
        <TabIcon icon={<Bookmark size={18} />} active={tab === 'saved'} onClick={() => setTab('saved')} title="Saved lists" />
      </div>

      {/* Active tab body */}
      <div className="relative">
        {/* Mine */}
        {tab === 'mine' && (
          <GridWrap columns={3}>
            {postsMine.map((p) => (
              <PostCard key={p.id} post={p} onOpen={(id) => setOpenPostId(id)} />
            ))}
            {byMe.isLoading && <LoadingNote />}
            {!byMe.isLoading && postsMine.length === 0 && <EmptyNote text="No posts yet." />}
          </GridWrap>
        )}

        {/* Following */}
        {tab === 'following' && (
          <GridWrap columns={3}>
            {postsFollowing.map((p) => (
              <PostCard key={p.id} post={p} onOpen={(id) => setOpenPostId(id)} />
            ))}
            {following.isLoading && <LoadingNote />}
            {!following.isLoading && postsFollowing.length === 0 && <EmptyNote text="No posts from people you follow yet." />}
          </GridWrap>
        )}

        {/* Liked */}
        {tab === 'liked' && (
          <GridWrap columns={3}>
            {postsLiked.map((p) => (
              <PostCard key={p.id} post={p} onOpen={(id) => setOpenPostId(id)} />
            ))}
            {liked.isLoading && <LoadingNote />}
            {!liked.isLoading && postsLiked.length === 0 && <EmptyNote text="You haven’t liked any posts yet." />}
          </GridWrap>
        )}

        {/* Saved */}
        {tab === 'saved' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(lists.data ?? []).map((l) => (
                <button
                  key={l.id}
                  onClick={() => setOpenListId((prev) => (prev === l.id ? null : l.id))}
                  className={`px-3 py-1 rounded-full border ${openListId === l.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Open list"
                >
                  {l.name}
                </button>
              ))}
              {lists.isLoading && <span className="text-sm text-gray-500">Loading…</span>}
              {!lists.isLoading && !lists.data?.length && <span className="text-sm text-gray-500">No saved lists yet.</span>}
            </div>

            {openListId && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(listItems.data?.profiles ?? []).map((pr) => (
                  <Link key={pr.id} href={`/u/${pr.handle}`} className="p-3 border rounded-xl hover:shadow-sm transition">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                        {pr.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pr.avatarUrl} alt="" className="object-cover w-full h-full" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-medium">{pr.displayName}</div>
                        <div className="text-xs text-gray-500">@{pr.handle}</div>
                      </div>
                    </div>
                  </Link>
                ))}
                {listItems.isLoading && <LoadingNote />}
                {!listItems.isLoading && (listItems.data?.profiles?.length ?? 0) === 0 && (
                  <EmptyNote text="This list is empty." />
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating sort button */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setShowSort((s) => !s)}
            className="rounded-full shadow-lg border bg-white px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
            title="Sort / filter media"
          >
            <Filter size={16} /> <span className="hidden md:inline">Filter</span> <ChevronDown size={14} />
          </button>
          {showSort && (
            <div className="mt-2 w-40 rounded-xl border bg-white shadow-lg p-1">
              {(['all', 'images', 'videos'] as Media[]).map((opt) => (
                <button
                  key={opt}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${media === opt ? 'bg-gray-100' : ''}`}
                  onClick={() => {
                    setMedia(opt)
                    setShowSort(false)
                  }}
                >
                  {opt === 'all' ? 'All' : opt === 'images' ? 'Images' : 'Videos'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔳 Modal mounted once at root */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}

/* ——— helpers ——— */

function TabIcon(props: { icon: React.ReactNode; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      title={props.title}
      onClick={props.onClick}
      className={`p-2 rounded-lg border ${props.active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
    >
      {props.icon}
    </button>
  )
}

function GridWrap({ children, columns }: { children: React.ReactNode; columns: 2 | 3 }) {
  return <div className={`grid grid-cols-2 ${columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>{children}</div>
}

function LoadingNote() {
  return <div className="text-sm text-gray-500">Loading…</div>
}
function EmptyNote({ text }: { text: string }) {
  return <div className="text-sm text-gray-500">{text}</div>
}
