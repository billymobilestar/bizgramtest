// src/app/components/PostModal.tsx
'use client'

import { useEffect } from 'react'
import { api } from '@/app/providers'
import LikeButton from './LikeButton'
import Comments from '@/components/Comments'
import SavePostButton from '@/components/SavePostButton'
import SharePostButton from './SharePostButton'
import Link from 'next/link'

export default function PostModal({
  openId,
  onClose,
}: {
  openId: string | null
  onClose: () => void
}) {
  const isOpen = !!openId
  const postId = openId ?? '' // stable param for the hook

  // ✅ Always call the hook; use `enabled` to fetch only when open
  const { data, isLoading, error } = api.post.getById.useQuery(
    { id: postId },
    { enabled: isOpen, refetchOnWindowFocus: false }
  )

  // Optional: close on Escape, but keep the hook call order stable
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && <div className="p-6">Loading…</div>}
        {error && (
          <div className="p-6 text-red-600">
            {String((error as any)?.message || 'Failed to load')}
          </div>
        )}
        {data && (
          <div className="grid md:grid-cols-2">
            {/* media */}
            <div className="relative bg-gray-100 aspect-square md:aspect-auto md:min-h-[420px]">
              {data.assets[0] && (
                // use <img> to avoid remote-domain config issues
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.assets[0].url}
                  alt={data.assets[0].altText ?? ''}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* right column */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Link href={`/u/${data.author.handle}`} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200">
                    {data.author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.author.avatarUrl}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    ) : null}
                  </div>
                  <div className="text-sm font-medium">
                    {data.author.displayName}{' '}
                    <span className="text-gray-500">@{data.author.handle}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <LikeButton
                    postId={data.id}
                    initialLiked={data.myLike}
                    initialCount={data.likeCount}
                  />
                  <SavePostButton postId={data.id} />
                  <SharePostButton postId={data.id} />
                </div>
              </div>

              {data.caption && (
                <p className="text-sm whitespace-pre-wrap">{data.caption}</p>
              )}
              {data.tags?.length ? (
                <div className="text-xs text-gray-600">#{data.tags.join(' #')}</div>
              ) : null}
              <div className="text-xs text-gray-500">
                {new Date(data.createdAt).toLocaleString()}
              </div>

              <div className="pt-2">
                <h3 className="font-semibold mb-2">
                  Comments ({data.commentCount ?? 0})
                </h3>
                <Comments postId={data.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
