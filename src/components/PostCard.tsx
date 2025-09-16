'use client'

import Link from 'next/link'
import LikeButton from '@/app/components/LikeButton'

type Post = {
  id: string
  caption?: string | null
  likeCount?: number
  myLike?: boolean
  author?: { handle?: string; displayName?: string | null }
  assets?: { url: string; altText?: string | null }[]
}

export default function PostCard({
  post,
  onOpen,
}: {
  post: Post
  onOpen?: (id: string) => void
}) {
  const first = post.assets?.[0]

  return (
    <div
      className="relative group border rounded-xl overflow-hidden bg-white cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(post.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(post.id)
        }
      }}
    >
      {first ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={first.url}
          alt={first.altText ?? ''}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-gray-100" />
      )}

      {/*<div className="p-2 flex items-center justify-between">
        <Link
          href={post.author?.handle ? `/u/${post.author.handle}` : '#'}
          className="text-sm font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {post.author?.displayName ?? '—'}
        </Link> */}

        {/* stop clicks from bubbling so the card doesn't open when liking */}
       {/*} <div onClick={(e) => e.stopPropagation()}>
          <LikeButton
            postId={post.id}
            initialLiked={post.myLike}
            initialCount={post.likeCount ?? 0}
          />
        </div>
      </div> */}
    </div>
  )
}
