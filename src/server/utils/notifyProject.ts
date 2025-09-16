import { prisma } from '@/server/utils/prisma'
import { allowedRecipients, notifyMany } from '@/server/utils/notify'

export async function notifyCallsheetPublished(projectId: string) {
  const proj = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { include: { profile: { select: { userId: true } } } } }
  })
  if (!proj) return
  const recipients = proj.members.map(m => m.profile?.userId).filter(Boolean) as string[]
  const allowed = await allowedRecipients(recipients, { type: 'project', id: proj.id })
  await notifyMany({
    recipients: allowed,
    type: 'CALLSHEET_PUBLISHED',
    level: 'ACTIONABLE',
    title: `Call sheet published — ${proj.name}`,
    body: 'Tap to review the latest call sheet.',
    url: `/projects/${proj.id}/callsheet/print`,
    context: { type: 'project', id: proj.id },
  })
}