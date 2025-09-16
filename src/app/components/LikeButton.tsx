'use client'
import { api } from '@/app/providers'
import { useState } from 'react'

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string
  initialLiked?: boolean
  initialCount?: number
}) {
  const [liked, setLiked] = useState(!!initialLiked)
  const [count, setCount] = useState(initialCount ?? 0)

  const { mutate, isPending } = api.post.toggleLike.useMutation({
    onSuccess: (res: { liked: boolean; likeCount: number }) => {
      setLiked(res.liked)
      setCount(res.likeCount)
    },
  })

  return (
    <button
    type="button"
    className={`px-2 py-1 border rounded text-sm ${liked ? 'bg-red-50 border-red-300 text-red-600' : ''}`}
    onClick={(e) => { e.stopPropagation(); mutate({ postId }) }}
    disabled={isPending}
    aria-pressed={liked}
    title={liked ? 'Unlike' : 'Like'}
  >
    {liked ? '♥' : '♡'} {count}
  </button>
  )
}
