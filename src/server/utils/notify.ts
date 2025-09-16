// src/server/utils/notify.ts
import { prisma } from '@/server/utils/prisma'
import type { NotificationType, NotificationLevel, Prisma } from '@prisma/client'

// Ensure values are JSON-serializable and typed for Prisma
function toJsonValue(v: unknown): Prisma.InputJsonValue {
  // JSON round-trip guarantees plain data (no Dates/Maps/Functions)
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
}

/**
 * Two-argument notify helper:
 *   notify(recipientUserId, { ...payload })
 *
 * - Skips self notifications (except SYSTEM) unless allowSelf=true
 * - Respects NotificationMute for (contextType, contextId)
 * - Stores extra fields under Notification.data (typed as Prisma.InputJsonValue)
 */
export async function notify(
  recipientUserId: string,
  input: {
    type: NotificationType
    level?: NotificationLevel
    title?: string | null
    body?: string | null
    contextType?: string | null
    contextId?: string | null
    actorUserId?: string | null
    data?: Record<string, unknown> | null
    url?: string | null // goes into data.url
    allowSelf?: boolean
  }
) {
  const {
    type,
    level,
    title,
    body,
    contextType,
    contextId,
    actorUserId,
    data,
    url,
    allowSelf,
  } = input

  // Avoid self-spam for non-SYSTEM types
  if (!allowSelf && actorUserId && actorUserId === recipientUserId && type !== ('SYSTEM' as NotificationType)) {
    return null
  }

  // Honor mutes if a context is provided
  if (contextType && contextId) {
    const muted = await prisma.notificationMute.findUnique({
      where: {
        userId_contextType_contextId: {
          userId: recipientUserId,
          contextType,
          contextId,
        },
      },
    })
    if (muted && (!muted.until || muted.until > new Date())) {
      return null
    }
  }

  // Prepare optional JSON payload for Notification.data
  const payloadData =
    data != null
      ? toJsonValue(data)
      : url != null
      ? toJsonValue({ url })
      : undefined; // IMPORTANT: use undefined (not null) to satisfy Prisma type

  return prisma.notification.create({
    data: {
      userId: recipientUserId,
      type,
      level: level ?? ('INFO' as NotificationLevel),
      title: title ?? undefined,
      body: body ?? undefined,
      contextType: contextType ?? undefined,
      contextId: contextId ?? undefined,
      actorUserId: actorUserId ?? undefined,
      ...(payloadData !== undefined ? { data: payloadData } : {}), // only set when we have data
    },
  })
}

/** Filter out recipients who have muted this context */
export async function allowedRecipients(
  recipients: string[],
  context: { type: string; id: string }
): Promise<string[]> {
  if (!recipients.length) return []
  const mutes = await prisma.notificationMute.findMany({
    where: {
      userId: { in: recipients },
      contextType: context.type,
      contextId: context.id,
    },
    select: { userId: true, until: true },
  })
  if (!mutes.length) return recipients
  const now = new Date()
  const mutedActive = new Set(
    mutes
      .filter((m) => !m.until || m.until > now)
      .map((m) => m.userId)
  )
  return recipients.filter((u) => !mutedActive.has(u))
}

/** Batch notify convenience wrapper */
export async function notifyMany(input: {
  recipients: string[]
  type: NotificationType
  level?: NotificationLevel
  title?: string | null
  body?: string | null
  context?: { type: string; id: string } | null
  actorUserId?: string | null
  data?: Record<string, unknown> | null
  url?: string | null
  allowSelf?: boolean
}) {
  const {
    recipients,
    type,
    level,
    title,
    body,
    context,
    actorUserId,
    data,
    url,
    allowSelf,
  } = input

  if (!recipients?.length) return []

  const payload = {
    type,
    level,
    title,
    body,
    contextType: context?.type ?? null,
    contextId: context?.id ?? null,
    actorUserId: actorUserId ?? null,
    data: data ?? null,
    url: url ?? null,
    allowSelf: !!allowSelf,
  }

  return Promise.all(recipients.map((uid) => notify(uid, payload)))
}