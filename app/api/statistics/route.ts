import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let dateFilter: any = {}
    
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    } else {
      // Default to last 30 days
      const defaultStart = new Date()
      defaultStart.setDate(defaultStart.getDate() - 30)
      dateFilter = {
        gte: defaultStart,
        lte: new Date(),
      }
    }

    const where = { createdAt: dateFilter }

    const [
      budgetStats,
      expenditureStats,
      projectStats,
      transactionStats,
      userStats,
      monthlyTrends,
    ] = await Promise.all([
      // Budget Statistics
      prisma.budget.aggregate({
        where,
        _sum: {
          amount: true,
          allocatedAmount: true,
        },
        _count: true,
        _avg: {
          amount: true,
        }
      }),

      // Expenditure Statistics
      prisma.expenditure.aggregate({
        where,
        _sum: {
          amount: true,
        },
        _count: true,
        _avg: {
          amount: true,
        }
      }),

      // Project Statistics
      prisma.project.aggregate({
        where,
        _count: true,
      }),

      // Transaction Statistics
      prisma.transaction.aggregate({
        where: {
          ...where,
          status: 'SUCCESS',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),

      // User Statistics
      prisma.user.aggregate({
        _count: true,
      }),

      // Monthly Trends
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as budget_count,
          SUM(amount) as budget_amount,
          COUNT(CASE WHEN "entity" = 'EXPENDITURE' THEN 1 END) as expenditure_count,
          SUM(CASE WHEN "entity" = 'EXPENDITURE' THEN amount ELSE 0 END) as expenditure_amount
        FROM (
          SELECT "createdAt", amount, 'BUDGET' as entity FROM "Budget"
          UNION ALL
          SELECT "createdAt", amount, 'EXPENDITURE' as entity FROM "Expenditure"
        ) combined
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
    ])

    // Get status distribution
    const budgetStatus = await prisma.budget.groupBy({
      by: ['status'],
      _count: true,
      where,
    })

    const expenditureStatus = await prisma.expenditure.groupBy({
      by: ['status'],
      _count: true,
      where,
    })

    const projectStatus = await prisma.project.groupBy({
      by: ['status'],
      _count: true,
      where,
    })

    const statistics = {
      budgets: {
        totalAmount: budgetStats._sum.amount || 0,
        allocatedAmount: budgetStats._sum.allocatedAmount || 0,
        totalCount: budgetStats._count,
        averageAmount: budgetStats._avg.amount || 0,
        availableBalance: (budgetStats._sum.amount || 0) - (budgetStats._sum.allocatedAmount || 0),
        byStatus: budgetStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count
          return acc
        }, {}),
      },
      expenditures: {
        totalAmount: expenditureStats._sum.amount || 0,
        totalCount: expenditureStats._count,
        averageAmount: expenditureStats._avg.amount || 0,
        byStatus: expenditureStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count
          return acc
        }, {}),
      },
      projects: {
        totalCount: projectStats._count,
        byStatus: projectStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count
          return acc
        }, {}),
      },
      transactions: {
        totalAmount: transactionStats._sum.amount || 0,
        totalCount: transactionStats._count,
        averageAmount: transactionStats._count > 0 ? (transactionStats._sum.amount || 0) / transactionStats._count : 0,
      },
      users: {
        total: userStats._count,
      },
      trends: monthlyTrends,
    }

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error: any) {
    console.error('Statistics fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}