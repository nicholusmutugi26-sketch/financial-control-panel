import { prisma } from '@/lib/prisma'

async function deleteUnwantedUsers() {
  try {
    console.log('🔍 Starting user cleanup...\n')

    // Find the users to keep
    const usersToKeep = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'nicholus mutugi', mode: 'insensitive' } },
          { role: 'ADMIN' }
        ]
      },
      select: { id: true, name: true, email: true, role: true }
    })

    console.log('✅ Users to KEEP:')
    usersToKeep.forEach(u => console.log(`   - ${u.name} (${u.email}) [${u.role}]`))
    console.log()

    // Find users to delete
    const usersToDelete = await prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: usersToKeep.map(u => u.id) } }
        ]
      },
      select: { id: true, name: true, email: true }
    })

    if (usersToDelete.length === 0) {
      console.log('ℹ️  No users to delete.')
      return
    }

    console.log(`🗑️  Users to DELETE (${usersToDelete.length}):`)
    usersToDelete.forEach(u => console.log(`   - ${u.name} (${u.email})`))
    console.log()

    // Delete in transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Delete related records for each user
      for (const user of usersToDelete) {
        // Delete notifications
        await tx.notification.deleteMany({ where: { userId: user.id } })
        
        // Delete audit logs
        await tx.auditLog.deleteMany({ where: { userId: user.id } })
        
        // Delete remittances
        await tx.remittance.deleteMany({ where: { userId: user.id } })
        
        // Delete votes
        await tx.vote.deleteMany({ where: { userId: user.id } })
        
        // Delete system settings updated by user
        await tx.systemSetting.deleteMany({ where: { updatedBy: user.id } })
        
        // Delete user preferences
        await tx.userPreference.deleteMany({ where: { userId: user.id } })
        
        // Delete expenditure items, then expenditures
        const expenditures = await tx.expenditure.findMany({
          where: { createdBy: user.id },
          select: { id: true }
        })
        for (const exp of expenditures) {
          await tx.expenditureItem.deleteMany({ where: { expenditureId: exp.id } })
        }
        await tx.expenditure.deleteMany({ where: { createdBy: user.id } })
        
        // Delete supplementary budgets
        await tx.supplementaryBudget.deleteMany({ where: { createdBy: user.id } })
        
        // Delete budget revisions
        await tx.budgetRevision.deleteMany({ where: { userId: user.id } })
        
        // Delete budget items
        await tx.budgetItem.deleteMany({ where: { createdBy: user.id } })
        
        // Delete budgets
        await tx.budget.deleteMany({ where: { createdBy: user.id } })
        
        // Delete projects
        await tx.project.deleteMany({ where: { createdBy: user.id } })
        
        // Delete transactions
        await tx.transaction.deleteMany({ where: { userId: user.id } })
        
        // Delete reports
        await tx.report.deleteMany({ where: { createdBy: user.id } })
        
        // Finally, delete the user
        await tx.user.delete({ where: { id: user.id } })
      }
      
      return usersToDelete.length
    })

    console.log(`✨ Successfully deleted ${result} user(s)!\n`)
    console.log('📊 Final user count:')
    const finalUsers = await prisma.user.findMany({
      select: { name: true, email: true, role: true }
    })
    console.log(`   Total: ${finalUsers.length} user(s)`)
    finalUsers.forEach(u => console.log(`   - ${u.name} (${u.email}) [${u.role}]`))

  } catch (error) {
    console.error('❌ Error deleting users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteUnwantedUsers()
