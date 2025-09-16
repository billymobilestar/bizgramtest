// prisma/fix-empty-emails.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const empties = await prisma.user.findMany({ where: { email: '' } })
  for (const u of empties) {
    const newEmail = `${u.id}@dev.local`
    await prisma.user.update({ where: { id: u.id }, data: { email: newEmail } })
    console.log(`Updated user ${u.id} -> ${newEmail}`)
  }
  console.log(`Fixed ${empties.length} user(s) with empty email.`)
}

main().finally(() => prisma.$disconnect())
