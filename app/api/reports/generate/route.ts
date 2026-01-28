import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument as PDFLibDocument, StandardFonts, rgb } from 'pdf-lib'
import { z } from 'zod'
import { generateReportPeriod, getReportDateRange } from '@/lib/utils'

const generateReportSchema = z.object({
  type: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeUsers: z.boolean().default(false),
  includeBudgets: z.boolean().default(true),
  includeExpenditures: z.boolean().default(true),
  includeProjects: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow both ADMIN and USER roles to generate reports
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = generateReportSchema.parse(body)

    // Use custom dates if provided, otherwise calculate based on report type
    let startDate: Date
    let endDate: Date
    
    if (validatedData.startDate && validatedData.endDate) {
      startDate = new Date(validatedData.startDate)
      endDate = new Date(validatedData.endDate)
    } else {
      const dateRange = getReportDateRange(validatedData.type)
      startDate = dateRange.startDate
      endDate = dateRange.endDate
    }

    // Generate report data
    const reportData: any = {
      type: validatedData.type,
      period: generateReportPeriod(validatedData.type, startDate),
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    }

    // Get user statistics
    if (validatedData.includeUsers) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              budgets: true,
              expenditures: true,
              projects: true,
            }
          }
        }
      })
      reportData.users = users
      reportData.userStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        regularUsers: users.filter(u => u.role === 'USER').length,
      }
    }

    // Get budget statistics
    if (validatedData.includeBudgets) {
      const budgets = await prisma.budget.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          batches: true,
        }
      })

      const budgetStats = await prisma.budget.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        _sum: {
          amount: true,
          allocatedAmount: true,
        },
        _count: true,
        _avg: {
          amount: true,
        }
      })

      reportData.budgets = budgets
      reportData.budgetStats = {
        totalAmount: budgetStats._sum.amount || 0,
        allocatedAmount: budgetStats._sum.allocatedAmount || 0,
        totalCount: budgetStats._count,
        averageAmount: budgetStats._avg.amount || 0,
        byStatus: await getCountByStatus('Budget', startDate, endDate),
        byPriority: await getCountByPriority('Budget', startDate, endDate),
      }
    }

    // Get expenditure statistics
    if (validatedData.includeExpenditures) {
      const expenditures = await prisma.expenditure.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          items: true,
          budget: {
            select: {
              title: true,
            }
          }
        }
      })

      const expenditureStats = await prisma.expenditure.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        _sum: {
          amount: true,
        },
        _count: true,
        _avg: {
          amount: true,
        }
      })

      reportData.expenditures = expenditures
      reportData.expenditureStats = {
        totalAmount: expenditureStats._sum.amount || 0,
        totalCount: expenditureStats._count,
        averageAmount: expenditureStats._avg.amount || 0,
        byStatus: await getCountByStatus('Expenditure', startDate, endDate),
        byPriority: await getCountByPriority('Expenditure', startDate, endDate),
      }
    }

    // Get project statistics
    if (validatedData.includeProjects) {
      const projects = await prisma.project.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          votes: true,
          budget: {
            select: {
              title: true,
            }
          }
        }
      })

      const projectStats = await prisma.project.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        _count: true,
      })

      reportData.projects = projects
      reportData.projectStats = {
        totalCount: projectStats._count,
        byStatus: await getCountByStatus('Project', startDate, endDate),
        voteStats: await getVoteStatistics(startDate, endDate),
      }
    }

    // Get transaction statistics
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        budget: {
          select: {
            title: true,
          }
        }
      }
    })

    const transactionStats = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    reportData.transactions = transactions
    reportData.transactionStats = {
      totalAmount: transactionStats._sum.amount || 0,
      totalCount: transactionStats._count,
      byStatus: await getCountByStatus('Transaction', startDate, endDate),
      byType: await getCountByType('Transaction', startDate, endDate),
    }

    // Build report PDF and persist Report record
    const reportId = `report-${Date.now()}`
    
    const pdfDoc = await PDFLibDocument.create()
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Enhanced professional color palette with modern, elegant colors
    const colors = {
      // Primary brand colors - deep professional blues
      primary: rgb(0.08, 0.25, 0.45),        // Deep navy blue
      primaryLight: rgb(0.15, 0.35, 0.6),   // Medium blue
      primaryLighter: rgb(0.25, 0.45, 0.7), // Light blue
      
      // Success and growth colors
      success: rgb(0.05, 0.4, 0.25),        // Deep emerald green
      successLight: rgb(0.2, 0.6, 0.4),     // Medium green
      successLighter: rgb(0.35, 0.7, 0.5),  // Light green
      
      // Warning and accent colors
      warning: rgb(0.85, 0.5, 0.1),         // Warm amber
      warningLight: rgb(0.95, 0.65, 0.2),   // Light amber
      danger: rgb(0.75, 0.2, 0.2),          // Professional red
      orange: rgb(0.9, 0.5, 0.1),           // Professional orange
      
      // Neutral and text colors
      textPrimary: rgb(0.15, 0.15, 0.15),   // Dark charcoal
      textSecondary: rgb(0.4, 0.4, 0.4),    // Medium gray
      textLight: rgb(0.6, 0.6, 0.6),        // Light gray
      
      // Background colors
      bgLight: rgb(0.97, 0.97, 0.98),       // Very light gray
      bgMedium: rgb(0.92, 0.93, 0.95),      // Light gray-blue
      bgDark: rgb(0.85, 0.87, 0.89),        // Medium gray
      
      // Border and accent colors
      border: rgb(0.75, 0.77, 0.8),         // Subtle border gray
      accent: rgb(0.6, 0.3, 0.8),           // Professional purple
      
      // Pure colors for contrast
      white: rgb(1, 1, 1),
      black: rgb(0, 0, 0),
    }

    const addNewPage = () => {
      const page = pdfDoc.addPage([612, 792])
      return page
    }

    const drawText = (page: any, text: string, x: number, y: number, size: number, bold: boolean = false, color: any = colors.textPrimary, font: any = null) => {
      const selectedFont = font || (bold ? timesBold : timesRoman)
      page.drawText(text, { x, y, size, font: selectedFont, color })
      return y - (size + 4)
    }

    const drawCenteredText = (page: any, text: string, y: number, size: number, bold: boolean = false, color: any = colors.textPrimary, font: any = null) => {
      const selectedFont = font || (bold ? timesBold : timesRoman)
      page.drawText(text, { x: 306 - (text.length * size * 0.3), y, size, font: selectedFont, color })
      return y - (size + 4)
    }

    const drawSectionBorder = (page: any, x: number, y: number, width: number) => {
      // Draw top border
      page.drawLine({
        start: { x: x, y: y + 15 },
        end: { x: x + width, y: y + 15 },
        thickness: 2,
        color: colors.border
      })
      // Draw bottom border
      page.drawLine({
        start: { x: x, y: y - 5 },
        end: { x: x + width, y: y - 5 },
        thickness: 2,
        color: colors.border
      })
    }

    const drawSectionBox = (page: any, x: number, y: number, width: number, height: number, bgColor: any = colors.bgLight, borderColor: any = colors.border) => {
      // Draw background
      page.drawRectangle({ x, y: y - height, width, height, color: bgColor, borderWidth: 0 })
      // Draw border
      page.drawRectangle({ x, y: y - height, width, height, color: borderColor, borderWidth: 1 })
    }

    const drawTableHeader = (page: any, headers: string[], startX = 50, startY = 700, colWidths: number[] = [100, 100, 100, 100]) => {
      let x = startX
      // Draw header background
      drawSectionBox(page, startX, startY + 5, colWidths.reduce((a, b) => a + b, 0), 25, colors.primary, colors.primary)
      
      headers.forEach((header, i) => {
        drawText(page, header, x + 5, startY - 8, 10, true, colors.white, helveticaBold)
        x += colWidths[i]
      })
      return startY - 25
    }

    const drawTableRow = (page: any, values: string[], startX = 50, startY = 675, colWidths: number[] = [100, 100, 100, 100], bgColor = colors.white, isAlternate = false) => {
      const rowBg = isAlternate ? colors.bgMedium : bgColor
      let x = startX
      drawSectionBox(page, startX, startY + 5, colWidths.reduce((a, b) => a + b, 0), 20, rowBg, colors.border)
      
      values.forEach((value, i) => {
        drawText(page, value, x + 5, startY - 5, 9, false, colors.textPrimary, helvetica)
        x += colWidths[i]
      })
      return startY - 20
    }

    // ============== PAGE 1: PROFESSIONAL COVER & EXECUTIVE SUMMARY ==============
    let page = addNewPage()
    let y = 780

    // Professional header with gradient effect
    drawSectionBox(page, 0, 750, 612, 70, colors.primary, colors.primary)
    y = 740
    drawCenteredText(page, 'FINANCIAL CONTROL PANEL', y, 20, true, colors.white, timesBold)
    y = 710
    drawCenteredText(page, `${validatedData.type.toUpperCase()} FINANCIAL REPORT`, y, 16, true, colors.white, timesBold)

    // Report metadata in elegant box
    y = 650
    drawSectionBox(page, 50, y + 10, 512, 80, colors.bgLight, colors.border)
    drawText(page, 'REPORT DETAILS', 70, y, 12, true, colors.primary, timesBold)
    y -= 20
    drawText(page, `Period: ${reportData.period}`, 70, y, 10, false, colors.textPrimary, timesRoman)
    y -= 15
    drawText(page, `Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })}`, 70, y, 10, false, colors.textSecondary, timesRoman)
    y -= 15
    drawText(page, `Prepared by: ${session.user.name}`, 70, y, 10, false, colors.textSecondary, timesRoman)
    y -= 15
    drawText(page, `Report ID: ${reportId}`, 70, y, 9, false, colors.textLight, timesRoman)

    // Executive Summary Section with borders
    y -= 30
    drawSectionBorder(page, 50, y + 15, 512)
    drawText(page, 'EXECUTIVE SUMMARY', 70, y, 14, true, colors.primary, timesBold)
    drawSectionBorder(page, 50, y - 5, 512)
    y -= 25

    // Financial Overview in professional boxes
    const allocated = reportData.budgetStats?.totalAmount || 0
    const spent = reportData.expenditureStats?.totalAmount || 0
    const remaining = allocated - spent
    const utilization = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0'

    // Key metrics in elegant layout
    drawSectionBox(page, 50, y + 5, 512, 60, colors.bgLight, colors.border)
    y = drawText(page, 'FINANCIAL OVERVIEW', 70, y, 11, true, colors.success, timesBold)
    y -= 18
    drawText(page, `Total Budget Allocation: KES ${allocated.toLocaleString()}`, 70, y, 9, false, colors.textPrimary, timesRoman)
    drawText(page, `Total Expenditures: KES ${spent.toLocaleString()}`, 330, y, 9, false, colors.textPrimary, timesRoman)
    y -= 12
    drawText(page, `Remaining Balance: KES ${remaining.toLocaleString()}`, 70, y, 9, false, colors.textPrimary, timesRoman)
    drawText(page, `Utilization Rate: ${utilization}%`, 330, y, 9, false, colors.textPrimary, timesRoman)
    y -= 20

    // Performance indicators
    drawSectionBorder(page, 50, y + 15, 512)
    drawText(page, 'PERFORMANCE INDICATORS', 70, y, 12, true, colors.primary, timesBold)
    drawSectionBorder(page, 50, y - 5, 512)
    y -= 25

    // Activity metrics
    const budgetCount = reportData.budgetStats?.totalCount || 0
    const expenditureCount = reportData.expenditureStats?.totalCount || 0
    const projectCount = reportData.projectStats?.totalCount || 0
    const transactionCount = reportData.transactionStats?.totalCount || 0

    drawSectionBox(page, 50, y + 5, 512, 45, colors.bgLight, colors.border)
    y = drawText(page, 'ACTIVITY METRICS', 70, y, 10, true, colors.primary, timesBold)
    y -= 15
    drawText(page, `Budgets Created: ${budgetCount}`, 70, y, 8, false, colors.textPrimary, timesRoman)
    drawText(page, `Expenditures Processed: ${expenditureCount}`, 200, y, 8, false, colors.textPrimary, timesRoman)
    drawText(page, `Projects Managed: ${projectCount}`, 380, y, 8, false, colors.textPrimary, timesRoman)
    y -= 10
    drawText(page, `Transactions Recorded: ${transactionCount}`, 70, y, 8, false, colors.textPrimary, timesRoman)

    // Budget status breakdown - conditional
    if (reportData.budgetStats?.byStatus) {
      const statusEntries = Object.entries(reportData.budgetStats.byStatus)
      let statusX = 60
      let statusY = y

      statusEntries.forEach(([status, count]: any) => {
        drawText(page, `${status}: ${count}`, statusX, statusY, 8)
        statusX += 120
        if (statusX > 420) {
          statusX = 60
          statusY -= 12
        }
      })
      
      y = statusY - 8
      // Border after Budget Status Breakdown
      y -= 6
      drawSectionBorder(page, 50, y, 512)
      y -= 8
    }

    // Expenditure breakdown by status - on same page
    y -= 10
    if (reportData.expenditureStats?.byStatus) {
      drawText(page, 'EXPENDITURE STATUS BREAKDOWN', 60, y, 10, true, colors.primary)
      y -= 14

      const expStatusEntries = Object.entries(reportData.expenditureStats.byStatus)
      let expX = 60
      let expY = y

      expStatusEntries.forEach(([status, count]: any) => {
        drawText(page, `${status}: ${count}`, expX, expY, 8)
        expX += 120
        if (expX > 420) {
          expX = 60
          expY -= 12
        }
      })
      
      y = expY - 8
      // Border after Expenditure Status Breakdown
      y -= 6
      drawSectionBorder(page, 50, y, 512)
      y -= 8
    }

    // Budget Allocation Efficiency Analysis - on same page
    if (y > 200 && reportData.budgetStats && reportData.expenditureStats) {
      y -= 10
      drawText(page, 'ALLOCATION EFFICIENCY', 60, y, 10, true, colors.primary)
      y -= 14

      const budgetAlloc = reportData.budgetStats.totalAmount || 0
      const budgetSpent = reportData.expenditureStats.totalAmount || 0
      const allocEfficiency = budgetAlloc > 0 ? ((budgetSpent / budgetAlloc) * 100).toFixed(1) : '0'
      
      drawText(page, `Allocated: KES ${budgetAlloc.toLocaleString()}`, 60, y, 8)
      drawText(page, `Spent: KES ${budgetSpent.toLocaleString()}`, 330, y, 8)
      y -= 10
      drawText(page, `Efficiency: ${allocEfficiency}% - ${parseFloat(allocEfficiency) > 100 ? 'Over-budget' : parseFloat(allocEfficiency) > 80 ? 'Well-utilized' : 'Under-utilized'}`, 60, y, 8)
      y -= 10
      // Border after Budget Allocation Efficiency
      y -= 6
      drawSectionBorder(page, 50, y, 512)
      y -= 8
    }

    // Transaction Summary - on same page
    if (y > 120 && reportData.transactionStats) {
      y -= 10
      drawText(page, 'TRANSACTION ACTIVITY', 60, y, 10, true, colors.primary)
      y -= 14

      drawText(page, `Total Transactions: ${reportData.transactionStats.totalCount}`, 60, y, 8)
      drawText(page, `Total: KES ${(reportData.transactionStats.totalAmount || 0).toLocaleString()}`, 330, y, 8)
      y -= 10
      drawText(page, `Avg per Transaction: KES ${(reportData.transactionStats.totalAmount / (reportData.transactionStats.totalCount || 1)).toLocaleString()}`, 60, y, 8)
      y -= 10
      // Border after Transaction Activity
      y -= 6
      drawSectionBorder(page, 50, y, 512)
      y -= 8
    }

    // ============== TREND ANALYSIS COMMENTED OUT & FINANCIAL EVOLUTION ==============
    if (y > 150) {
      drawSectionBorder(page, 50, y + 15, 512)
      drawText(page, 'TREND ANALYSIS & FINANCIAL EVOLUTION', 70, y, 12, true, colors.primary, timesBold)
      drawSectionBorder(page, 50, y - 5, 512)
      y -= 25

      // Calculate trend metrics
      const avgBudgetSize = budgetCount > 0 ? allocated / budgetCount : 0
      const avgExpenditureSize = expenditureCount > 0 ? spent / expenditureCount : 0
      const spendingEfficiency = avgExpenditureSize > 0 ? (avgBudgetSize / avgExpenditureSize * 100).toFixed(1) : '0'
      
      // Growth indicators box
      drawSectionBox(page, 50, y + 5, 512, 80, colors.bgLight, colors.border)
      y = drawText(page, 'FINANCIAL HEALTH METRICS', 70, y, 10, true, colors.success, timesBold)
      y -= 16
      
      // Row 1: Budget vs Spending Analysis
      drawText(page, `Average Budget Size: KES ${avgBudgetSize.toLocaleString()}`, 70, y, 8, false, colors.textPrimary, timesRoman)
      drawText(page, `Average Expenditure: KES ${avgExpenditureSize.toLocaleString()}`, 330, y, 8, false, colors.textPrimary, timesRoman)
      y -= 12
      
      // Row 2: Efficiency and Project metrics
      const completedProjects = reportData.projectStats?.byStatus?.COMPLETED || 0
      const inProgressProjects = reportData.projectStats?.byStatus?.IN_PROGRESS || 0
      const projectCompletionRate = projectCount > 0 ? ((completedProjects / projectCount) * 100).toFixed(1) : '0'
      
      drawText(page, `Budget Efficiency: ${spendingEfficiency}%`, 70, y, 8, false, colors.textPrimary, timesRoman)
      drawText(page, `Project Completion: ${projectCompletionRate}%`, 330, y, 8, false, colors.textPrimary, timesRoman)
      y -= 12
      
      // Row 3: Growth indicators
      const utilizationNum = parseFloat(utilization)
      const growthIndicator = utilizationNum > 90 ? 'High Activity' : utilizationNum > 70 ? 'Healthy Growth' : utilizationNum > 50 ? 'Moderate' : 'Low Activity'
      const growthColor = utilizationNum > 90 ? colors.success : utilizationNum > 70 ? colors.primaryLight : utilizationNum > 50 ? colors.warning : colors.danger
      
      drawText(page, `Activity Level: ${growthIndicator}`, 70, y, 8, false, growthColor, timesRoman)
      drawText(page, `Projects Active: ${inProgressProjects} | Completed: ${completedProjects}`, 330, y, 8, false, colors.textPrimary, timesRoman)
      y -= 20

      // Spending Pattern Analysis
      drawSectionBorder(page, 50, y + 15, 512)
      drawText(page, 'SPENDING PATTERN ANALYSIS', 70, y, 11, true, colors.primary, timesBold)
      drawSectionBorder(page, 50, y - 5, 512)
      y -= 25

      drawSectionBox(page, 50, y + 5, 512, 40, colors.bgLight, colors.border)
      y = drawText(page, 'EXPENDITURE TRENDS', 70, y, 9, true, colors.primary, timesBold)
      y -= 14
      
      // Analyze spending patterns
      const spendingRatio = allocated > 0 ? (spent / allocated) : 0
      let spendingAnalysis = ''
      let analysisColor = colors.textPrimary
      
      if (spendingRatio > 1.1) {
        spendingAnalysis = '⚠️  OVER-SPENDING: Expenditures exceed budget allocations by ' + ((spendingRatio - 1) * 100).toFixed(1) + '%'
        analysisColor = colors.danger
      } else if (spendingRatio > 0.9) {
        spendingAnalysis = '✅ OPTIMAL: Excellent budget utilization with ' + utilization + '% spending rate'
        analysisColor = colors.success
      } else if (spendingRatio > 0.7) {
        spendingAnalysis = '📈 HEALTHY: Good spending momentum at ' + utilization + '% utilization'
        analysisColor = colors.primaryLight
      } else if (spendingRatio > 0.4) {
        spendingAnalysis = '⚡ MODERATE: Steady spending at ' + utilization + '% - room for acceleration'
        analysisColor = colors.warning
      } else {
        spendingAnalysis = '🐌 LOW ACTIVITY: Only ' + utilization + '% utilization - consider increasing spending pace'
        analysisColor = colors.danger
      }
      
      drawText(page, spendingAnalysis, 70, y, 8, false, analysisColor, timesRoman)
      y -= 30
    }

    // ============== PAGE 2: DETAILED ANALYSIS & SUPPLEMENTARY BUDGETS ==============
    page = addNewPage()
    y = 780

    // Professional header
    drawSectionBox(page, 0, 750, 612, 50, colors.primary, colors.primary)
    drawCenteredText(page, 'DETAILED FINANCIAL ANALYSIS', 765, 16, true, colors.white, timesBold)
    y = 720

    // Supplementary Budgets Analysis Section
    drawSectionBorder(page, 50, y + 15, 512)
    drawText(page, 'SUPPLEMENTARY BUDGET ANALYSIS', 70, y, 12, true, colors.primary, timesBold)
    drawSectionBorder(page, 50, y - 5, 512)
    y -= 25

    // Fetch supplementary budget data for analysis
    const supplementaryBudgets = await prisma.supplementaryBudget.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: {
        budget: {
          select: {
            title: true,
            amount: true,
          }
        }
      }
    })

    const approvedSupps = supplementaryBudgets.filter(sb => sb.status === 'APPROVED')
    const pendingSupps = supplementaryBudgets.filter(sb => sb.status === 'PENDING')
    const rejectedSupps = supplementaryBudgets.filter(sb => sb.status === 'REJECTED')
    
    const totalSuppAmount = approvedSupps.reduce((sum, sb) => sum + (sb.amount || 0), 0)
    const totalOriginalBudgets = supplementaryBudgets.length > 0 ? 
      supplementaryBudgets.reduce((sum, sb) => sum + (sb.budget?.amount || 0), 0) / supplementaryBudgets.length : 0

    drawSectionBox(page, 50, y + 5, 512, 70, colors.bgLight, colors.border)
    y = drawText(page, 'SUPPLEMENTARY BUDGET METRICS', 70, y, 10, true, colors.warning, timesBold)
    y -= 16
    
    drawText(page, `Approved: ${approvedSupps.length} requests | KES ${totalSuppAmount.toLocaleString()}`, 70, y, 8, false, colors.success, timesRoman)
    drawText(page, `Pending: ${pendingSupps.length} requests`, 350, y, 8, false, colors.warning, timesRoman)
    y -= 12
    drawText(page, `Rejected: ${rejectedSupps.length} requests`, 70, y, 8, false, colors.danger, timesRoman)
    drawText(page, `Avg Original Budget: KES ${totalOriginalBudgets.toLocaleString()}`, 350, y, 8, false, colors.textSecondary, timesRoman)
    y -= 12
    
    // Supplementary budget trend analysis
    const suppRatio = totalOriginalBudgets > 0 ? (totalSuppAmount / totalOriginalBudgets) * 100 : 0
    const suppTrend = suppRatio > 20 ? 'High supplementary needs' : suppRatio > 10 ? 'Moderate adjustments' : 'Stable budgeting'
    const suppColor = suppRatio > 20 ? colors.danger : suppRatio > 10 ? colors.warning : colors.success
    
    drawText(page, `Trend: ${suppTrend} (${suppRatio.toFixed(1)}% of original budgets)`, 70, y, 8, false, suppColor, timesRoman)
    y -= 25

    // Project Performance Analysis
    drawSectionBorder(page, 50, y + 15, 512)
    drawText(page, 'PROJECT PERFORMANCE ANALYSIS', 70, y, 12, true, colors.primary, timesBold)
    drawSectionBorder(page, 50, y - 5, 512)
    y -= 25

    if (reportData.projects && reportData.projects.length > 0) {
      drawSectionBox(page, 50, y + 5, 512, 60, colors.bgLight, colors.border)
      y = drawText(page, 'PROJECT EXECUTION METRICS', 70, y, 10, true, colors.success, timesBold)
      y -= 16
      
      const completed = reportData.projectStats?.byStatus?.COMPLETED || 0
      const inProgress = reportData.projectStats?.byStatus?.IN_PROGRESS || 0
      const pending = reportData.projectStats?.byStatus?.PENDING || 0
      const totalProjects = reportData.projects.length
      
      drawText(page, `Completed: ${completed} | In Progress: ${inProgress} | Pending: ${pending}`, 70, y, 8, false, colors.textPrimary, timesRoman)
      y -= 12
      
      const completionRate = totalProjects > 0 ? ((completed / totalProjects) * 100).toFixed(1) : '0'
      const executionColor = parseFloat(completionRate) > 70 ? colors.success : parseFloat(completionRate) > 40 ? colors.warning : colors.danger
      
      drawText(page, `Completion Rate: ${completionRate}%`, 70, y, 8, false, executionColor, timesRoman)
      drawText(page, `Active Projects: ${inProgress}`, 300, y, 8, false, colors.primaryLight, timesRoman)
      y -= 12
      
      // Project budget utilization
      const projectsWithBudgets = reportData.projects.filter((p: any) => p.budget).length
      const budgetUtilization = totalProjects > 0 ? ((projectsWithBudgets / totalProjects) * 100).toFixed(1) : '0'
      
      drawText(page, `Projects with Budgets: ${projectsWithBudgets}/${totalProjects} (${budgetUtilization}%)`, 70, y, 8, false, colors.textSecondary, timesRoman)
    } else {
      drawText(page, 'No projects found in this reporting period', 70, y, 9, false, colors.textSecondary, timesRoman)
    }

    // Detailed listings section - conditional on having data
    if ((reportData.budgets && reportData.budgets.length > 0) || (reportData.expenditures && reportData.expenditures.length > 0)) {
      // Left column - Budgets
      let leftY = y
      let budgetCount = 0
      const leftColX = 50
      const leftColWidth = 280

      if (reportData.budgets && reportData.budgets.length > 0) {
        leftY = drawText(page, 'BUDGETS', leftColX, leftY, 10, true, colors.primary)
        leftY -= 12

        for (const budget of reportData.budgets.slice(0, 12)) {
          if (leftY < 150) break

          leftY = drawText(page, `${budgetCount + 1}. ${budget.title}`, leftColX + 5, leftY, 9, true, colors.success)
          leftY = drawText(page, `KES ${budget.amount?.toLocaleString() || 0}`, leftColX + 5, leftY, 8)
          leftY = drawText(page, `${budget.status} | ${budget.priority || 'N/A'}`, leftColX + 5, leftY, 8, false, colors.textSecondary)
          leftY -= 12
          budgetCount++
        }

        if (reportData.budgets.length > 12) {
          leftY = drawText(page, `[+${reportData.budgets.length - 12} more]`, leftColX + 5, leftY, 8, false, colors.orange)
        }
      }

      // Right column - Expenditures
      const rightY = y
      let expCount = 0
      const rightColX = 330
      const rightColWidth = 280

      if (reportData.expenditures && reportData.expenditures.length > 0) {
        let ry = rightY
        ry = drawText(page, 'EXPENDITURES', rightColX, ry, 10, true, colors.primary)
        ry -= 12

        for (const exp of reportData.expenditures.slice(0, 12)) {
          if (ry < 150) break

          ry = drawText(page, `${expCount + 1}. ${exp.title}`, rightColX + 5, ry, 9, true, colors.success)
          ry = drawText(page, `KES ${exp.amount?.toLocaleString() || 0}`, rightColX + 5, ry, 8)
          ry = drawText(page, `${exp.status}`, rightColX + 5, ry, 8, false, colors.textSecondary)
          ry -= 12
          expCount++
        }

        if (reportData.expenditures.length > 12) {
          ry = drawText(page, `[+${reportData.expenditures.length - 12} more]`, rightColX + 5, ry, 8, false, colors.warning)
        }

        y = Math.min(leftY, ry) - 20
      } else {
        y = leftY - 20
      }
    }

    // ============== PAGE 3: PROJECT PROGRESS & DEVELOPMENT ==============
    if (reportData.projects && reportData.projects.length > 0) {
      page = addNewPage()
      y = 780

      drawSectionBox(page, 0, 710, 612, 40, colors.primary, colors.black)
      drawCenteredText(page, 'PROJECT PROGRESS & DEVELOPMENT', 728, 13, true, colors.white)
      y = 700

      // Project status summary
      drawText(page, 'Project Status Summary:', 50, y, 11, true, colors.primary)
      y -= 20

      if (reportData.projectStats?.byStatus) {
        const statusEntries = Object.entries(reportData.projectStats.byStatus)
        let statusX = 60
        let statusY = y
        
        statusEntries.forEach((entry: any) => {
          const statusColor = entry[0] === 'COMPLETED' ? colors.success : 
                             entry[0] === 'IN_PROGRESS' ? colors.orange : colors.textSecondary
          drawText(page, `${entry[0]}: ${entry[1]}`, statusX, statusY, 9, false, statusColor)
          statusX += 120
          if (statusX > 450) {
            statusX = 60
            statusY -= 16
          }
        })
        y -= 50
        // Border after Project Status Summary
        y -= 8
        drawSectionBorder(page, 50, y, 512)
        y -= 10
      }

      // Individual project details
      let projectCount = 0
      for (const project of reportData.projects.slice(0, 12)) {
        if (y < 120) {
          page = addNewPage()
          y = 750
        }

        y = drawText(page, `${projectCount + 1}. ${project.title}`, 60, y, 10, true, colors.primary)
        y = drawText(page, `Status: ${project.status} | Budget: ${project.budget?.title || 'N/A'} | Votes: ${project.votes?.length || 0}`, 60, y, 8)
        y = drawText(page, `Progress: ${project.progressPercentage || 0}% | Owner: ${project.user?.name || 'Unknown'}`, 60, y, 8)

        y -= 16
        y -= 8
        drawSectionBorder(page, 50, y, 512)
        y -= 10
        projectCount++
      }

      if (reportData.projects.length > 12) {
        drawText(page, `[${reportData.projects.length - 12} additional projects not shown]`, 50, y, 8, false, colors.textSecondary)
      }
    }

    // ============== PAGE 4: FUND UTILIZATION & GROWTH ANALYSIS ==============
    page = addNewPage()
    y = 780

    drawSectionBox(page, 0, 710, 612, 40, colors.primary, colors.black)
    drawCenteredText(page, 'FUND UTILIZATION & GROWTH ANALYSIS', 728, 13, true, colors.white)
    y = 630

    // Calculate fund health metrics
    const budgetTotal = allocated
    const spentAmount = spent
    const remainingAmount = remaining
    const utilizationRate = budgetTotal > 0 ? ((spentAmount / budgetTotal) * 100).toFixed(2) : '0'
    
    // Determine fund health status
    const utilizationNum = parseFloat(utilizationRate)
    let fundHealthStatus = ''
    let fundHealthColor = colors.textPrimary
    
    if (utilizationNum >= 85 && utilizationNum <= 95) {
      fundHealthStatus = 'OPTIMAL - Funds properly allocated and utilized'
      fundHealthColor = colors.success
    } else if (utilizationNum > 95) {
      fundHealthStatus = 'OVER-UTILIZED - Monitor spending closely'
      fundHealthColor = colors.danger
    } else if (utilizationNum >= 70 && utilizationNum < 85) {
      fundHealthStatus = 'HEALTHY - Good fund management'
      fundHealthColor = colors.success
    } else if (utilizationNum > 0 && utilizationNum < 70) {
      fundHealthStatus = 'UNDERUTILIZED - Opportunity for growth'
      fundHealthColor = colors.orange
    } else {
      fundHealthStatus = 'NO DATA - No fund activity this period'
      fundHealthColor = colors.textSecondary
    }

    // Fund Health Section - with dynamic height
    const fundStartY = y - 10
    const fundContentLines = 5  // 5 lines of content (header + 4 metrics + status)
    const fundBoxHeight = fundContentLines * 14 + 30  // Calculate height dynamically
    const fundBoxY = fundStartY - fundBoxHeight + 5
    
    drawSectionBox(page, 50, fundBoxY, 512, fundBoxHeight, colors.primaryLight, colors.black)
    
    // Header inside box - white text on grey background
    drawText(page, 'FUND HEALTH STATUS', 60, fundStartY - 8, 13, true, colors.white)
    
    // Content inside box with proper spacing - light text
    let contentY = fundStartY - 28
    drawText(page, `Overall Budget Allocation: KES ${budgetTotal.toLocaleString()}`, 60, contentY, 8, false, colors.white)
    contentY -= 14
    drawText(page, `Total Funds Spent: KES ${spent.toLocaleString()}`, 60, contentY, 8, false, colors.white)
    contentY -= 14
    drawText(page, `Remaining Balance: KES ${remaining.toLocaleString()}`, 60, contentY, 8, false, colors.white)
    contentY -= 14
    drawText(page, `Utilization Rate: ${utilizationRate}%`, 60, contentY, 8, false, colors.white)
    contentY -= 14
    drawText(page, `Status: ${fundHealthStatus}`, 60, contentY, 8, false, fundHealthColor)
    
    y = fundBoxY - 40
    // Border after Fund Health Status
    y -= 8
    drawSectionBorder(page, 50, y, 512)
    y -= 10

    // Growth Indicators Section - with dynamic height
    if (y > 320) {
      const growthStartY = y - 10
      
      // Count content lines for growth section
      let growthContentLines = 5  // Project total + completed + in progress + efficiency + transaction metrics
      const growthBoxHeight = growthContentLines * 14 + 30
      const growthBoxY = growthStartY - growthBoxHeight + 5
      
      drawSectionBox(page, 50, growthBoxY, 512, growthBoxHeight, colors.successLight, colors.black)
      
      // Header inside box - white text on grey background
      drawText(page, 'GROWTH INDICATORS & EVOLUTION', 60, growthStartY - 8, 13, true, colors.white)
      
      // Content inside box with proper spacing - light text
      let contentY = growthStartY - 28

      // Project completion rate
      const completedProjects = reportData.projectStats?.byStatus?.COMPLETED || 0
      const inProgressProjects = reportData.projectStats?.byStatus?.IN_PROGRESS || 0
      const totalProjects = reportData.projectStats?.totalCount || 0
      const projectCompletionRate = totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0'

      drawText(page, `Total Projects in Period: ${totalProjects}`, 60, contentY, 8, false, colors.white)
      contentY -= 14
      drawText(page, `Projects Completed: ${completedProjects} (${projectCompletionRate}%)`, 60, contentY, 8, false, colors.white)
      contentY -= 14
      drawText(page, `Projects In Progress: ${inProgressProjects}`, 60, contentY, 8, false, colors.white)
      contentY -= 14
      
      // Efficiency metrics
      const avgBudgetUtilization = reportData.budgetStats?.totalCount > 0 ? 
        ((reportData.budgetStats?.allocatedAmount / reportData.budgetStats?.totalAmount) * 100).toFixed(1) : '0'
      
      drawText(page, `Budget Allocation Efficiency: ${avgBudgetUtilization}%`, 60, contentY, 8, false, colors.white)
      contentY -= 14
      drawText(page, `Avg Expend. per Trans: KES ${(reportData.transactionStats?.totalAmount / (reportData.transactionStats?.totalCount || 1)).toLocaleString()}`, 60, contentY, 8, false, colors.white)

      y = growthBoxY - 40
      // Border after Growth Indicators
      y -= 8
      drawSectionBorder(page, 50, y, 512)
      y -= 10

      // Fetch remittance and supplementary budget data (for both accountability and summary sections)
      const remittances = await prisma.remittance.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'VERIFIED'
        }
      })

      const supplementaryBudgets = await prisma.supplementaryBudget.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        }
      })

      const totalRemittances = remittances.reduce((sum, r) => sum + (r.amount || 0), 0)
      const remittanceCount = remittances.length
      const supplementaryCount = supplementaryBudgets.filter(sb => sb.status === 'APPROVED').length
      const supplementaryTotal = supplementaryBudgets
        .filter(sb => sb.status === 'APPROVED')
        .reduce((sum, sb) => sum + (sb.amount || 0), 0)

      // ACCOUNTABILITY & PLANNING METRICS SECTION
      if (y > 250) {
        // Accountability assessment
        const isAccountableGrowth = remittanceCount > 0 && supplementaryCount === 0
        const hasBudgetConsolidation = reportData.budgetStats?.totalCount < 50
        const hasReducedSupplementary = supplementaryCount < 3

        y -= 15
        const accountabilityBoxStartY = y
        const accountabilityHeight = 70  // Reduced from 90
        
        drawSectionBox(page, 50, accountabilityBoxStartY - accountabilityHeight, 512, accountabilityHeight, colors.successLight, colors.black)

        y = drawText(page, 'ACCOUNTABILITY & PLANNING INDICATORS', 60, y, 10, true, colors.success)
        y -= 14

        drawText(page, `Verified Remittances: ${remittanceCount} | Total: KES ${totalRemittances.toLocaleString()}`, 60, y, 7)
        y -= 12
        drawText(page, `Supplementary Budgets Approved: ${supplementaryCount} | Total: KES ${supplementaryTotal.toLocaleString()}`, 60, y, 7)
        y -= 12
        
        const accountabilityStatus = isAccountableGrowth ? '[OK] Strong Accountability' : 
                                     hasReducedSupplementary ? '[OK] Improved Planning' : 'Normal Activity'
        drawText(page, `Status: ${accountabilityStatus}`, 60, y, 7, false, isAccountableGrowth ? colors.success : colors.textPrimary)
        y -= 10
        // Border after Accountability & Planning Indicators
        y -= 6
        drawSectionBorder(page, 50, y, 512)
        y -= 8
      }

      // Add spacing before summary section
      y -= 25

      // Report Quality Indicators
      if (y > 100) {
        drawText(page, 'REPORT PERIOD SUMMARY & RECOMMENDATIONS:', 50, y, 11, true, colors.primary)
        y -= 18

        // Calculate growth metrics
        const budgetGrowthTrend = reportData.budgetStats?.totalCount > 15 ? 'declining' : 'stable'
        const spendingHealth = utilizationNum > 100 ? 'over-spending' : utilizationNum > 80 ? 'healthy' : 'under-utilizing'
        const projectProgress = completedProjects > 0 ? 'positive' : 'needs activation'
        
        // Build contextual summary
        let summaryText = ''
        let recommendationColor = colors.textPrimary
        
        if (utilizationNum > 100) {
          // Over-budget scenario
          summaryText = `[ALERT] ATTENTION REQUIRED: Budget utilization at ${utilizationRate}% indicates spending exceeds allocations. RECOMMENDATIONS: (1) Review supplementary budget approvals - ${supplementaryCount} approved this period. (2) Implement spending controls to prevent budget overruns. (3) Schedule budget rebalancing review. (4) Monitor monthly expenditures to stay within approved limits.`
          recommendationColor = colors.orange
        } else if (utilizationNum > 80) {
          // Healthy scenario
          summaryText = `[OK] POSITIVE GROWTH: Budget utilization at ${utilizationRate}% shows excellent fund management. With ${projectCompletionRate}% project completion and ${remittanceCount} verified remittances (KES ${totalRemittances.toLocaleString()}), the organization demonstrates strong accountability. RECOMMENDATIONS: (1) Maintain current spending discipline. (2) Continue project momentum with ${completedProjects} completed. (3) Consider allocating recovered funds to pending projects. (4) Document best practices for sustainability.`
          recommendationColor = colors.success
        } else if (utilizationNum > 50) {
          // Moderate scenario
          summaryText = `[OK] STEADY PROGRESS: Budget utilization at ${utilizationRate}% shows controlled spending. With ${projectCompletionRate}% project completion and reduced supplementary budgets (${supplementaryCount}), planning is improving. RECOMMENDATIONS: (1) Accelerate project implementations to increase utilization. (2) Review pending expenditure approvals. (3) Plan for underutilized budget allocation to active projects. (4) Strengthen project execution timelines.`
          recommendationColor = colors.primary
        } else {
          // Low utilization scenario
          summaryText = `[ALERT] OPPORTUNITY FOR GROWTH: Budget utilization at ${utilizationRate}% indicates significant unspent allocations. With only ${projectCompletionRate}% project completion, acceleration is needed. RECOMMENDATIONS: (1) Activate stalled projects to increase fund utilization. (2) Review project pipeline for bottlenecks. (3) Increase expenditure pace aligned with allocations. (4) Implement quarterly reviews to track spending momentum. (5) Consider reallocating excess budget to high-priority initiatives.`
          recommendationColor = colors.orange
        }

        // Word wrap the summary
        const maxChars = 90
        const summaryLines: string[] = []
        let currentLine = ''
        summaryText.split(' ').forEach((word: string) => {
          if ((currentLine + word).length > maxChars) {
            summaryLines.push(currentLine.trim())
            currentLine = word
          } else {
            currentLine += (currentLine ? ' ' : '') + word
          }
        })
        if (currentLine) summaryLines.push(currentLine.trim())

        summaryLines.forEach((line: string) => {
          y = drawText(page, line, 60, y, 8, false, recommendationColor)
        })
        y -= 12
        // Border after Report Period Summary & Recommendations
        y -= 8
        drawSectionBorder(page, 50, y, 512)
        y -= 10
      }
    }

    // ============== PROFESSIONAL FOOTER ON ALL PAGES ==============
    const pages = pdfDoc.getPages()
    const currentYear = new Date().getFullYear()
    const totalPages = pages.length

    pages.forEach((p: any, index: number) => {
      const pageNumber = index + 1
      
      // Add subtle border at bottom
      p.drawRectangle({ x: 0, y: 0, width: 612, height: 50, color: colors.bgMedium, borderWidth: 0 })
      
      // Separator line
      p.drawLine({ start: { x: 50, y: 45 }, end: { x: 562, y: 45 }, thickness: 1, color: colors.border })
      
      // Left side - Report info
      drawText(p, `Financial Control Panel - ${validatedData.type} Report`, 50, 35, 7, false, colors.textSecondary, helvetica)
      drawText(p, `Period: ${reportData.period}`, 50, 25, 7, false, colors.textLight, helvetica)
      
      // Center - Page number
      const pageText = `Page ${pageNumber} of ${totalPages}`
      drawCenteredText(p, pageText, 30, 8, false, colors.textSecondary, helvetica)
      
      // Right side - Copyright
      const copyrightText = `© ${currentYear} Financial Control Panel`
      drawText(p, copyrightText, 450, 35, 7, false, colors.textSecondary, helvetica)
      drawText(p, 'Confidential Document', 450, 25, 7, false, colors.textLight, helvetica)
    })

    const pdfBytes = await pdfDoc.save()
    
    // Persist report record
    const persistedReport = await prisma.report.create({
      data: {
        id: reportId,
        type: validatedData.type,
        period: reportData.period,
        filePath: `/api/reports/${reportId}/download`,
        createdBy: session.user.id,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'REPORT_GENERATED',
        entity: 'REPORT',
        entityId: persistedReport.id,
        userId: session.user.id,
        changes: {
          type: validatedData.type,
          period: reportData.period,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      report: {
        id: persistedReport.id,
        type: persistedReport.type,
        period: persistedReport.period,
        createdAt: persistedReport.createdAt,
        downloadUrl: `/api/reports/${persistedReport.id}/download`,
      },
    })
  } catch (error: any) {
    console.error('Report generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getCountByStatus(entity: string, startDate: Date, endDate: Date) {
  try {
    const model = (prisma as any)[entity.toLowerCase()]
    const result = await model.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })
    return result.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count
      return acc
    }, {})
  } catch (err) {
    return {}
  }
}

async function getCountByPriority(entity: string, startDate: Date, endDate: Date) {
  try {
    const model = (prisma as any)[entity.toLowerCase()]
    const result = await model.groupBy({
      by: ['priority'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })
    return result.reduce((acc: any, curr: any) => {
      acc[curr.priority] = curr._count
      return acc
    }, {})
  } catch (err) {
    return {}
  }
}

async function getCountByType(entity: string, startDate: Date, endDate: Date) {
  try {
    const model = (prisma as any)[entity.toLowerCase()]
    const result = await model.groupBy({
      by: ['type'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })
    return result.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr._count
      return acc
    }, {})
  } catch (err) {
    return {}
  }
}

async function getVoteStatistics(startDate: Date, endDate: Date) {
  try {
    const votes = await prisma.vote.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })

    const total = votes.length
    const byProject: Record<string, number> = {}
    let approve = 0
    let reject = 0

    for (const v of votes) {
      if (v.vote === 1) approve++
      if (v.vote === -1) reject++
      if (v.projectId) byProject[v.projectId] = (byProject[v.projectId] || 0) + 1
    }

    const approvalRate = total > 0 ? (approve / total) * 100 : 0
    return { total, byProject, approve, reject, approvalRate }
  } catch (err) {
    return { total: 0, byProject: {}, approve: 0, reject: 0, approvalRate: 0 }
  }
}