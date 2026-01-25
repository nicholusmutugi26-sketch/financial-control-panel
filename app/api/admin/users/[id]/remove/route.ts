import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = params.id
  try {
    const body = await req.json().catch(() => ({}))

    // check for related records that would block deletion
    const [
      budgetsCount,
      budgetItemsCount,
      supplementaryCount,
      expendituresCount,
      projectsCount,
      votesCount,
      transactionsCount,
      remittancesCount,
      reportsCount,
      notificationsCount,
      systemSettingsCount,
      auditLogsCount,
      preferencesCount
    ] = await Promise.all([
      prisma.budget.count({ where: { createdBy: userId } }),
      prisma.budgetItem.count({ where: { createdBy: userId } }),
      prisma.supplementaryBudget.count({ where: { createdBy: userId } }),
      prisma.expenditure.count({ where: { createdBy: userId } }),
      prisma.project.count({ where: { createdBy: userId } }),
      prisma.vote.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.remittance.count({ where: { userId } }),
      prisma.report.count({ where: { createdBy: userId } }),
      prisma.notification.count({ where: { userId } }),
      prisma.systemSetting.count({ where: { updatedBy: userId } }),
      prisma.auditLog.count({ where: { userId } }),
      prisma.userPreference.count({ where: { userId } }),
    ])

    const related = {
      budgets: budgetsCount,
      budgetItems: budgetItemsCount,
      supplementary: supplementaryCount,
      expenditures: expendituresCount,
      projects: projectsCount,
      votes: votesCount,
      transactions: transactionsCount,
      remittances: remittancesCount,
      reports: reportsCount,
      notifications: notificationsCount,
      systemSettings: systemSettingsCount,
      auditLogs: auditLogsCount,
      preferences: preferencesCount,
    }

    const totalRelated = Object.values(related).reduce((s, v) => s + (v || 0), 0)

    if (totalRelated > 0 && !body.force) {
      return NextResponse.json({
        error: 'Cannot delete user with related records',
        details: related
      }, { status: 400 })
    }

    if (totalRelated > 0 && body.force) {
      // perform deep delete of related records in a safe order
      const budgetIds = (await prisma.budget.findMany({ where: { createdBy: userId }, select: { id: true } })).map(b => b.id)

      const expendituresFromBudgets = await prisma.expenditure.findMany({ where: { budgetId: { in: budgetIds } }, select: { id: true } })
      const expendituresFromBudgetsIds = expendituresFromBudgets.map(e => e.id)

      const expendituresByUser = await prisma.expenditure.findMany({ where: { createdBy: userId }, select: { id: true } })
      const expendituresByUserIds = expendituresByUser.map(e => e.id)

      const allExpenditureIds = Array.from(new Set([...expendituresFromBudgetsIds, ...expendituresByUserIds]))

      const projectIdsFromBudgets = (await prisma.project.findMany({ where: { budgetId: { in: budgetIds } }, select: { id: true } })).map(p => p.id)
      const projectIdsByUser = (await prisma.project.findMany({ where: { createdBy: userId }, select: { id: true } })).map(p => p.id)
      const allProjectIds = Array.from(new Set([...projectIdsFromBudgets, ...projectIdsByUser]))

      await prisma.$transaction([
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.userPreference.deleteMany({ where: { userId } }),
        prisma.auditLog.deleteMany({ where: { userId } }),
        prisma.systemSetting.deleteMany({ where: { updatedBy: userId } }),

        prisma.remittance.deleteMany({ where: { userId } }),

        // delete expenditure items then expenditures
        prisma.expenditureItem.deleteMany({ where: { expenditureId: { in: allExpenditureIds } } }),
        prisma.expenditure.deleteMany({ where: { id: { in: allExpenditureIds } } }),

        // delete votes related to projects to be removed and votes by user
        prisma.vote.deleteMany({ where: { OR: [{ projectId: { in: allProjectIds } }, { userId }] } }),
        // delete projects
        prisma.project.deleteMany({ where: { id: { in: allProjectIds } } }),

        // delete batches, items, supplementary, revisions, transactions for budgets
        prisma.batch.deleteMany({ where: { budgetId: { in: budgetIds } } }),
        prisma.budgetItem.deleteMany({ where: { OR: [{ budgetId: { in: budgetIds } }, { createdBy: userId }] } }),
        prisma.supplementaryBudget.deleteMany({ where: { OR: [{ budgetId: { in: budgetIds } }, { createdBy: userId }] } }),
        prisma.budgetRevision.deleteMany({ where: { budgetId: { in: budgetIds } } }),
        prisma.transaction.deleteMany({ where: { OR: [{ budgetId: { in: budgetIds } }, { userId }] } }),

        // delete reports and other user-owned resources
        prisma.report.deleteMany({ where: { createdBy: userId } }),

        // finally delete budgets created by user
        prisma.budget.deleteMany({ where: { id: { in: budgetIds } } }),

        // delete votes and transactions by user (if any remain), remittances handled above
        prisma.vote.deleteMany({ where: { userId } }),
        prisma.transaction.deleteMany({ where: { userId } }),

      ])

      // after cleaning up related records, delete the user
      await prisma.user.delete({ where: { id: userId } })
      return NextResponse.json({ ok: true })
    }

    // nothing related, safe to remove
    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
