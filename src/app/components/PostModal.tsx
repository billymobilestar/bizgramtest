// src/app/components/PostModal.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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

  // Track image aspect ratio and computed box height (desktop only)
  const [aspect, setAspect] = useState<string | null>(null) // e.g., "1920/1080"
  const [ratio, setRatio] = useState<number | null>(null)   // H / W numeric
  const [boxHeight, setBoxHeight] = useState<number | null>(null)
  const mediaColRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect desktop (md and up)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // When we know the image ratio, fix the grid height based on the media column width (desktop)
  useEffect(() => {
    if (!ratio || !mediaColRef.current) return
    const el = mediaColRef.current

    const recompute = () => {
      const w = el.clientWidth
      const desired = w * ratio // height in px
      const cap = Math.floor(window.innerHeight * 0.9) // respect max 90vh
      setBoxHeight(Math.min(desired, cap))
    }

    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    window.addEventListener('resize', recompute)
    recompute()

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [ratio])

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
      {/* Close button (overlay-level) */}
      <button
        type="button"
        aria-label="Close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute z-[60] inline-flex items-center justify-center rounded-full text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-black/40 transition bg-black/80 hover:bg-black h-11 w-11 md:h-9 md:w-9 bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-auto md:top-4 md:right-4 md:left-auto"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-5 md:w-5">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-xl"
        style={{ height: isDesktop && boxHeight ? boxHeight : '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && <div className="p-6">Loading…</div>}
        {error && (
          <div className="p-6 text-red-600">
            {String((error as any)?.message || 'Failed to load')}
          </div>
        )}
        {data && (
          <div className="grid md:grid-cols-2 h-full">
            {/* media */}
            <div
              ref={mediaColRef}
              className="relative bg-gray-100 md:h-full"
              style={{ aspectRatio: !isDesktop && aspect ? aspect : undefined }}
            >
              {data.assets[0] && (
                // use <img> to avoid remote-domain config issues
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.assets[0].url}
                  alt={data.assets[0].altText ?? ''}
                  className="w-full h-full object-cover"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    if (img.naturalWidth && img.naturalHeight) {
                      setAspect(`${img.naturalWidth}/${img.naturalHeight}`)
                      setRatio(img.naturalHeight / img.naturalWidth)
                    }
                  }}
                />
              )}
            </div>

            {/* right column */}
            <div className="p-4 space-y-3 md:h-full h-full min-h-0 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b pb-2">
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
              {/* NEW: location under caption */}
              {data.location && (
                <div className="text-sm text-neutral-600">📍 {data.location}</div>
              )}

              {/* NEW: external link button */}
              {data.externalUrl && (
                <div className="pt-1">
                  <a
                    href={data.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Visit link
                  </a>
                </div>
              )}
              {data.tags?.length ? (
                <div className="text-xs text-gray-600">#{data.tags.join(' #')}</div>
              ) : null}

              <div className="pt-2 space-y-2">
                <div className="text-xs text-gray-500">
                  {new Date(data.createdAt).toLocaleString()}
                </div>
                <h3 className="font-semibold">Comments ({data.commentCount ?? 0})</h3>
                <div className="pr-1">
                  <Comments postId={data.id} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
