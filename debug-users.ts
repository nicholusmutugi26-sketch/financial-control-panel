import { prisma } from '@/lib/prisma'

async function main() {
  console.log('Checking all users in database...')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Total users: ${users.length}\n`)
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role} (expected: ${index === 0 ? 'ADMIN' : 'USER'})`)
    console.log(`   Approved: ${user.isApproved}`)
    console.log(`   Created: ${user.createdAt.toLocaleString()}\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
