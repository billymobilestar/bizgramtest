import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main(){
  const me = await prisma.user.findFirst()
  if(!me) return
  const p = await prisma.profile.findUnique({ where: { userId: me.id } })
  if(!p) return
  await prisma.service.create({
    data: { profileId: p.id, name: '60-sec Reel', unit: 'project', priceMin: 200, priceMax: 600 }
  })
}
main().finally(()=>prisma.$disconnect())
