'use client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { api } from '@/app/providers'
import PostCard from '@/components/PostCard'

export default function Client({ handle }: { handle: string }) {
  const p = api.profile.getByHandle.useQuery({ handle })
  const followStatus = api.follow.status.useQuery(
    { profileId: p.data?.id ?? '' },
    { enabled: !!p.data?.id }
  )
  const toggleFollow = api.follow.toggle.useMutation({ onSuccess: () => followStatus.refetch() })

  const byAuthor = api.feed.byAuthor.useInfiniteQuery(
    p.data ? { profileId: p.data.id, limit: 18 } : (undefined as any),
    { enabled: !!p.data?.id, getNextPageParam: (last) => last.nextCursor ?? undefined }
  )

  if (p.isLoading) return <p>Loading…</p>
  if (!p.data) return <p className="text-red-600">Profile not found.</p>

  const prof = p.data
  const professionsText =
    (prof.professions?.length ? prof.professions : [prof.profession].filter(Boolean)).join(' • ')
  const locationText = [prof.city, prof.region].filter(Boolean).join(', ')
  const accountTypeLabel = prof.accountType === 'COMPANY' ? 'Company' : 'Personal'

  const posts = byAuthor.data?.pages.flatMap((pg: any) => pg.items) ?? []

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200">
          {prof.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={prof.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="flex-1">
          <div className="text-xl font-semibold">
            {prof.displayName} <span className="text-gray-500">@{prof.handle}</span>
          </div>

          <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            {professionsText && <span>{professionsText}</span>}
            {locationText && <span>• {locationText}</span>}
            {prof.accountType && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                {accountTypeLabel}
              </span>
            )}
          </div>

          {prof.bio && <p className="text-sm text-gray-700 mt-2 max-w-xl">{prof.bio}</p>}

          {prof.portfolioUrl && (
            <a
              href={prof.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center mt-2 px-3 py-1 rounded-lg border hover:bg-gray-50"
            >
              SHOWREEL
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toggleFollow.mutate({ profileId: prof.id })}>
            {followStatus.data?.following ? 'Unfollow' : 'Follow'}
          </Button>
          <Link href="/messages" className="btn btn-outline">
            Message
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {posts.map((p: any) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  )
}
