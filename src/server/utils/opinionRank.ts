// src/server/utils/opinionRank.ts
export function computeScores(args: {
  reactionCount: number
  commentCount: number
  voteCount: number
  createdAt: Date
}) {
  const { reactionCount, commentCount, voteCount, createdAt } = args
  const wReact = 2
  const wComment = 3
  const wVote = 1
  const ageHours = (Date.now() - createdAt.getTime()) / 36e5

  const base = reactionCount * wReact + commentCount * wComment + voteCount * wVote
  const scoreHot = Math.log1p(Math.max(0, base)) - ageHours / 48
  const scoreTrend = base / (1 + ageHours / 6)

  return { scoreHot, scoreTrend }
}