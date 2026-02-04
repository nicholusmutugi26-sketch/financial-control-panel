import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Admin User with lowercase email
  const adminPassword = await bcrypt.hash('admin@financialpanel@2026', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@financialpanel.com' },
    update: {},
    create: {
      email: 'admin@financialpanel.com',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      phoneNumber: '254792919470',
      isApproved: true,
    },
  })

  // Create Test User (non-admin)
  const userPassword = await bcrypt.hash('user@financialpanel@2026', 12)
  const testUser = await prisma.user.upsert({
    where: { email: 'user@financialpanel.com' },
    update: {},
    create: {
      email: 'user@financialpanel.com',
      name: 'Test User',
      password: userPassword,
      phoneNumber: '254792919471',
      isApproved: true,
    },
  })

  console.log('Seeding completed!')
  console.log('- Admin user created:', admin.email)
  console.log('- Test user created:', testUser.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
