import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Resetting database - deleting all users and recreating admin...')

  try {
    // Delete in correct order to respect foreign keys
    console.log('Deleting data...')
    await prisma.auditLog.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.userPreference.deleteMany()
    await prisma.systemSetting.deleteMany()
    await prisma.expenditureItem.deleteMany()
    await prisma.expenditure.deleteMany()
    await prisma.budgetRevision.deleteMany()
    await prisma.supplementaryBudget.deleteMany()
    await prisma.budgetItem.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.budget.deleteMany()
    await prisma.vote.deleteMany()
    await prisma.project.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.report.deleteMany()
    await prisma.remittance.deleteMany()
    
    const deleteResult = await prisma.user.deleteMany()
    console.log(`✅ Deleted ${deleteResult.count} users and all related data`)

    // Create fresh admin user
    const adminPassword = await bcrypt.hash('admin@financialpanel@2026', 12)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@financialpanel.com',
        name: 'System Administrator',
        password: adminPassword,
        role: 'ADMIN',
        phoneNumber: '254792919470',
        isApproved: true,
      },
    })

    console.log('✅ Database reset complete!')
    console.log('- Admin user created:', admin.email)
    console.log('- Email: admin@financialpanel.com')
    console.log('- Password: admin@financialpanel@2026')
    console.log('- Role: ADMIN')
    console.log('- Approved: Yes (no approval needed)')
  } catch (error) {
    console.error('Error resetting database:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
