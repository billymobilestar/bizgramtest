'use client'

import LikeButton from './LikeButton'

type Asset = { id: string; url: string; altText?: string | null }
type Author = {
  handle: string
  displayName?: string | null
  avatarUrl?: string | null
}
type Post = {
  id: string
  caption?: string | null
  assets: Asset[]
  author?: Author | null
  likeCount?: number
}

export default function PostCard({ post }: { post: Post }) {
  const first = post.assets?.[0]

  return (
    <div className="border rounded-2xl overflow-hidden bg-white">
      {first && (
        <img
          src={first.url}
          alt={first.altText || ''}
          className="w-full h-64 object-cover"
        />
      )}

      <div className="p-3 space-y-2">
        {/* #4: avatar + name/handle that links to the profile */}
        {post.author?.handle && (
          <a href={`/u/${post.author.handle}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 shrink-0">
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="text-sm">
              <span className="font-medium">
                {post.author.displayName || post.author.handle}
              </span>{' '}
              <span className="text-gray-500">@{post.author.handle}</span>
            </div>
          </a>
        )}

        {post.caption && <p className="text-sm text-gray-800">{post.caption}</p>}

        <div className="flex items-center justify-between">
          <LikeButton postId={post.id} initialCount={post.likeCount} />
          {/* place Save / Share buttons here if you add them */}
        </div>
      </div>
    </div>
  )
}
