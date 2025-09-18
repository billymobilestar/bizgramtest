'use client'

type Post = {
  id: string
  caption?: string | null
  likeCount?: number
  myLike?: boolean
  author?: { handle?: string; displayName?: string | null }
  assets?: { url: string; altText?: string | null }[]
  // NEW optional fields
  location?: string | null
  externalUrl?: string | null
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
      className="relative group rounded-xl overflow-hidden bg-white cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.10)] transition-shadow"
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
    </div>
  )
}