import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetData() {
  try {
    console.log('Starting data reset...')

    // Delete all data in order of dependencies (respecting foreign keys)
    await prisma.notification.deleteMany({})
    await prisma.auditLog.deleteMany({})
    await prisma.vote.deleteMany({})
    await prisma.expenditureItem.deleteMany({})
    await prisma.expenditure.deleteMany({})
    await prisma.budgetRevision.deleteMany({})
    await prisma.budgetItem.deleteMany({})
    await prisma.supplementaryBudget.deleteMany({})
    await prisma.batch.deleteMany({})
    await prisma.budget.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.remittance.deleteMany({})
    await prisma.project.deleteMany({})
    await prisma.report.deleteMany({})
    await prisma.userPreference.deleteMany({})
    await prisma.systemSetting.deleteMany({})

    // Delete all users except admin
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    })

    const nonAdminIds = (
      await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true },
      })
    ).map((u) => u.id)

    if (nonAdminIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: nonAdminIds } },
      })
      console.log(`✓ Deleted ${nonAdminIds.length} non-admin users`)
    }

    // Ensure at least one admin exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    })

    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10)
      await prisma.user.create({
        data: {
          email: 'admin@financialcontrol.com',
          name: 'Admin User',
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true,
          phoneNumber: '+254712345678',
        },
      })
      console.log('✓ Created default admin user (admin@financialcontrol.com / Admin@123)')
    } else {
      console.log(`✓ ${adminCount} admin user(s) preserved`)
    }

    // Reset system settings to defaults
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (adminUser) {
      await prisma.systemSetting.upsert({
        where: { key: 'fund_pool_balance' },
        update: { value: '0' },
        create: {
          key: 'fund_pool_balance',
          value: '0',
          category: 'FINANCE',
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('\n✅ Data reset complete!')
    console.log('✓ All test data cleared')
    console.log('✓ Database schema preserved')
    console.log('✓ Admin user(s) retained')
    console.log('✓ Fund pool reset to 0')
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
