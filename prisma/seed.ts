import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Admin User
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
    },
  })

  console.log('Seeding completed!')
  console.log('- Admin user created:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
