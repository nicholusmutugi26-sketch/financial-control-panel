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
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    const helvetica = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

    // Professional grey-themed color palette
    const colors = {
      darkBlue: rgb(0.05, 0.2, 0.4),
      mediumBlue: rgb(0.15, 0.35, 0.6),
      lightBlue: rgb(0.35, 0.48, 0.65),  // Darker blue-grey
      darkGreen: rgb(0.0, 0.35, 0.1),
      lightGreen: rgb(0.35, 0.50, 0.35),  // Darker green-grey
      orange: rgb(0.95, 0.65, 0.1),
      lightOrange: rgb(0.60, 0.50, 0.25),  // Darker orange-grey
      red: rgb(0.8, 0.2, 0.2),  // Alert/warning red
      darkGray: rgb(0.15, 0.15, 0.15),
      mediumGray: rgb(0.4, 0.4, 0.4),
      lightGray: rgb(0.45, 0.45, 0.50),  // Darker grey
      greyBg: rgb(0.35, 0.35, 0.40),  // Dark grey background
      black: rgb(0, 0, 0),
      white: rgb(1, 1, 1),
    }

    const addNewPage = () => {
      const page = pdfDoc.addPage([612, 792])
      return page
    }

    const drawText = (page: any, text: string, x: number, y: number, size: number, bold = false, color = colors.darkGray) => {
      const font = bold ? helveticaBold : helvetica
      page.drawText(text, { x, y, size, font, color })
      return y - (size + 4)
    }

    const drawCenteredText = (page: any, text: string, y: number, size: number, bold = false, color = colors.darkGray) => {
      const font = bold ? helveticaBold : helvetica
      page.drawText(text, { x: 306 - (text.length * size * 0.3), y, size, font, color })
      return y - (size + 4)
    }

    const drawShadow = (page: any, x: number, y: number, width: number, height: number) => {
      // Draw darker, more visible black shadow
      page.drawRectangle({ x: x + 4, y: y - 4, width, height, color: rgb(0.7, 0.7, 0.7), borderWidth: 0 })
    }

    const drawPageShadow = (page: any) => {
      // Draw shadow around the page edges for document-level effect
      const pageWidth = 612
      const pageHeight = 792
      const shadowMargin = 8
      const shadowColor = rgb(0.2, 0.2, 0.2)
      
      // Top shadow
      page.drawRectangle({ x: 0, y: pageHeight - shadowMargin, width: pageWidth, height: shadowMargin, color: shadowColor, borderWidth: 0 })
      // Bottom shadow
      page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: shadowMargin, color: shadowColor, borderWidth: 0 })
      // Left shadow
      page.drawRectangle({ x: 0, y: 0, width: shadowMargin, height: pageHeight, color: shadowColor, borderWidth: 0 })
      // Right shadow
      page.drawRectangle({ x: pageWidth - shadowMargin, y: 0, width: shadowMargin, height: pageHeight, color: shadowColor, borderWidth: 0 })
    }

    const drawBorder = (page: any, x: number, y: number, width: number, height: number, color: any = colors.black, thickness = 2) => {
      // No border drawing - replaced with shadow
    }

    const drawFilledBox = (page: any, x: number, y: number, width: number, height: number, fillColor: any, borderColor = colors.black) => {
      // Draw box without borders, shadow only
      page.drawRectangle({ x, y, width, height, color: fillColor, borderWidth: 0 })
    }

    const drawSectionBorder = (page: any, x: number, y: number, width: number) => {
      // Draw thin line separator above section
      page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1.5, color: colors.darkBlue })
    }

    const drawTableHeader = (page: any, headers: string[], startX = 50, startY = 700, colWidths: number[] = [100, 100, 100, 100]) => {
      let x = startX
      headers.forEach((header, i) => {
        drawShadow(page, x, startY - 25, colWidths[i], 25)
        drawFilledBox(page, x, startY - 25, colWidths[i], 25, colors.darkBlue, colors.black)
        drawText(page, header, x + 5, startY - 8, 10, true, colors.white)
        x += colWidths[i]
      })
      return startY - 25
    }

    const drawTableRow = (page: any, values: string[], startX = 50, startY = 675, colWidths: number[] = [100, 100, 100, 100], bgColor = colors.white) => {
      let x = startX
      drawFilledBox(page, startX, startY - 20, colWidths.reduce((a, b) => a + b, 0), 20, bgColor, colors.black)
      values.forEach((value, i) => {
        drawText(page, value, x + 5, startY - 5, 9, false, colors.darkGray)
        x += colWidths[i]
      })
      return startY - 20
    }

    // ============== PAGE 1: COVER & SUMMARY ==============
    let page = addNewPage()
    let y = 780

    // Main header with background and shadow
    drawShadow(page, 0, 700, 612, 80)
    drawFilledBox(page, 0, 700, 612, 80, colors.darkBlue, colors.black)
    y = 760
    drawCenteredText(page, 'FINANCIAL CONTROL PANEL', y, 18, true, colors.white)
    y = 730
    drawCenteredText(page, `${validatedData.type.toUpperCase()} REPORT`, y, 14, true, colors.white)

    // Report Details Section (no background, just text)
    y = 670
    drawText(page, 'Report Details:', 50, y, 10, true, colors.darkBlue)
    y -= 16
    drawText(page, `Period: ${reportData.period}`, 60, y, 9)
    y -= 14
    drawText(page, `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString()}`, 60, y, 8)
    y -= 12
    drawText(page, `Prepared by: ${session.user.name} (${session.user.email})`, 60, y, 8)

    // FINANCIAL SUMMARY SECTION
    y -= 20
    drawText(page, 'FINANCIAL SUMMARY', 60, y, 10, true, colors.darkBlue)
    y -= 15

    // Summary content in compact two-column format
    if (reportData.budgetStats && reportData.expenditureStats) {
      const allocated = reportData.budgetStats.totalAmount || 0
      const spent = reportData.expenditureStats.totalAmount || 0
      const remaining = allocated - spent
      const utilization = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0'

      drawText(page, `Total Allocated: KES ${allocated.toLocaleString()}`, 60, y, 8)
      drawText(page, `Total Spent: KES ${spent.toLocaleString()}`, 330, y, 8)
      y -= 12
      drawText(page, `Remaining: KES ${remaining.toLocaleString()}`, 60, y, 8)
      drawText(page, `Utilization: ${utilization}%`, 330, y, 8)
      y -= 12
      // Border after Financial Summary
      y -= 6
      drawSectionBorder(page, 50, y, 512)
      y -= 8
    }

    // KEY METRICS SECTION
    y -= 12
    drawText(page, 'KEY METRICS', 60, y, 10, true, colors.darkGreen)
    y -= 14

    // Metrics in two columns - compact
    let col1X = 60
    let col2X = 330

    if (reportData.budgetStats) {
      drawText(page, `Budgets: ${reportData.budgetStats.totalCount} | Avg: KES ${(reportData.budgetStats.averageAmount || 0).toLocaleString()}`, col1X, y, 8)
      y -= 10
    }

    if (reportData.expenditureStats) {
      drawText(page, `Expenditures: ${reportData.expenditureStats.totalCount} | Avg: KES ${(reportData.expenditureStats.averageAmount || 0).toLocaleString()}`, col1X, y, 8)
      y -= 10
    }

    if (reportData.transactionStats) {
      drawText(page, `Transactions: ${reportData.transactionStats.totalCount} | Total: KES ${(reportData.transactionStats.totalAmount || 0).toLocaleString()}`, col1X, y, 8)
      y -= 10
    }

    // Border after Key Metrics
    y -= 6
    drawSectionBorder(page, 50, y, 512)
    y -= 8

    // STATUS BREAKDOWN SECTION (combined on same page)
    y -= 10
    if (reportData.budgetStats?.byStatus) {
      drawText(page, 'BUDGET STATUS BREAKDOWN', 60, y, 10, true, colors.darkBlue)
      y -= 14

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
      drawText(page, 'EXPENDITURE STATUS BREAKDOWN', 60, y, 10, true, colors.darkBlue)
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
      drawText(page, 'ALLOCATION EFFICIENCY', 60, y, 10, true, colors.darkBlue)
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
      drawText(page, 'TRANSACTION ACTIVITY', 60, y, 10, true, colors.darkBlue)
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

    // ============== PAGE 2: DETAILED BUDGET & EXPENDITURE LISTING (Two Columns) ==============
    // Budgets and Expenditures on same page with two columns
    if ((reportData.budgets && reportData.budgets.length > 0) || (reportData.expenditures && reportData.expenditures.length > 0)) {
      page = addNewPage()
      y = 780

      drawShadow(page, 0, 710, 612, 40)
      drawFilledBox(page, 0, 710, 612, 40, colors.darkBlue, colors.black)
      drawCenteredText(page, 'DETAILED BUDGET & EXPENDITURE LISTING', 728, 13, true, colors.white)
      y = 700

      // Left column - Budgets
      let leftY = y
      let budgetCount = 0
      const leftColX = 50
      const leftColWidth = 280

      if (reportData.budgets && reportData.budgets.length > 0) {
        leftY = drawText(page, 'BUDGETS', leftColX, leftY, 10, true, colors.darkBlue)
        leftY -= 12

        for (const budget of reportData.budgets.slice(0, 12)) {
          if (leftY < 150) break

          leftY = drawText(page, `${budgetCount + 1}. ${budget.title}`, leftColX + 5, leftY, 9, true, colors.darkGreen)
          leftY = drawText(page, `KES ${budget.amount?.toLocaleString() || 0}`, leftColX + 5, leftY, 8)
          leftY = drawText(page, `${budget.status} | ${budget.priority || 'N/A'}`, leftColX + 5, leftY, 8, false, colors.mediumGray)
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
        ry = drawText(page, 'EXPENDITURES', rightColX, ry, 10, true, colors.darkBlue)
        ry -= 12

        for (const exp of reportData.expenditures.slice(0, 12)) {
          if (ry < 150) break

          ry = drawText(page, `${expCount + 1}. ${exp.title}`, rightColX + 5, ry, 9, true, colors.darkGreen)
          ry = drawText(page, `KES ${exp.amount?.toLocaleString() || 0}`, rightColX + 5, ry, 8)
          ry = drawText(page, `${exp.status}`, rightColX + 5, ry, 8, false, colors.mediumGray)
          ry -= 12
          expCount++
        }

        if (reportData.expenditures.length > 12) {
          ry = drawText(page, `[+${reportData.expenditures.length - 12} more]`, rightColX + 5, ry, 8, false, colors.orange)
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

      drawShadow(page, 0, 710, 612, 40)
      drawFilledBox(page, 0, 710, 612, 40, colors.darkBlue, colors.black)
      drawCenteredText(page, 'PROJECT PROGRESS & DEVELOPMENT', 728, 13, true, colors.white)
      y = 700

      // Project status summary
      drawText(page, 'Project Status Summary:', 50, y, 11, true, colors.darkBlue)
      y -= 20

      if (reportData.projectStats?.byStatus) {
        const statusEntries = Object.entries(reportData.projectStats.byStatus)
        let statusX = 60
        let statusY = y
        
        statusEntries.forEach((entry: any) => {
          const statusColor = entry[0] === 'COMPLETED' ? colors.darkGreen : 
                             entry[0] === 'IN_PROGRESS' ? colors.orange : colors.mediumGray
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

        y = drawText(page, `${projectCount + 1}. ${project.title}`, 60, y, 10, true, colors.darkBlue)
        y = drawText(page, `Status: ${project.status} | Budget: ${project.budget?.title || 'N/A'} | Votes: ${project.votes?.length || 0}`, 60, y, 8)
        y = drawText(page, `Progress: ${project.progressPercentage || 0}% | Owner: ${project.user?.name || 'Unknown'}`, 60, y, 8)

        y -= 16
        y -= 8
        drawSectionBorder(page, 50, y, 512)
        y -= 10
        projectCount++
      }

      if (reportData.projects.length > 12) {
        drawText(page, `[${reportData.projects.length - 12} additional projects not shown]`, 50, y, 8, false, colors.mediumGray)
      }
    }

    // ============== PAGE 4: FUND UTILIZATION & GROWTH ANALYSIS ==============
    page = addNewPage()
    y = 780

    drawShadow(page, 0, 710, 612, 40)
    drawFilledBox(page, 0, 710, 612, 40, colors.darkBlue, colors.black)
    drawCenteredText(page, 'FUND UTILIZATION & GROWTH ANALYSIS', 728, 13, true, colors.white)
    y = 630

    // Calculate fund health metrics
    const budgetTotal = reportData.budgetStats?.totalAmount || 0
    const spent = reportData.expenditureStats?.totalAmount || 0
    const remaining = budgetTotal - spent
    const utilizationRate = budgetTotal > 0 ? ((spent / budgetTotal) * 100).toFixed(2) : '0'
    
    // Determine fund health status
    const utilizationNum = parseFloat(utilizationRate)
    let fundHealthStatus = ''
    let fundHealthColor = colors.darkGray
    
    if (utilizationNum >= 85 && utilizationNum <= 95) {
      fundHealthStatus = 'OPTIMAL - Funds properly allocated and utilized'
      fundHealthColor = colors.darkGreen
    } else if (utilizationNum > 95) {
      fundHealthStatus = 'OVER-UTILIZED - Monitor spending closely'
      fundHealthColor = colors.red
    } else if (utilizationNum >= 70 && utilizationNum < 85) {
      fundHealthStatus = 'HEALTHY - Good fund management'
      fundHealthColor = colors.darkGreen
    } else if (utilizationNum > 0 && utilizationNum < 70) {
      fundHealthStatus = 'UNDERUTILIZED - Opportunity for growth'
      fundHealthColor = colors.orange
    } else {
      fundHealthStatus = 'NO DATA - No fund activity this period'
      fundHealthColor = colors.mediumGray
    }

    // Fund Health Section - with dynamic height
    const fundStartY = y - 10
    const fundContentLines = 5  // 5 lines of content (header + 4 metrics + status)
    const fundBoxHeight = fundContentLines * 14 + 30  // Calculate height dynamically
    const fundBoxY = fundStartY - fundBoxHeight + 5
    
    drawShadow(page, 50, fundBoxY, 512, fundBoxHeight)
    drawFilledBox(page, 50, fundBoxY, 512, fundBoxHeight, colors.lightBlue, colors.black)
    
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
      
      drawShadow(page, 50, growthBoxY, 512, growthBoxHeight)
      drawFilledBox(page, 50, growthBoxY, 512, growthBoxHeight, colors.lightGreen, colors.black)
      
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
        
        drawShadow(page, 50, accountabilityBoxStartY - accountabilityHeight, 512, accountabilityHeight)
        drawFilledBox(page, 50, accountabilityBoxStartY - accountabilityHeight, 512, accountabilityHeight, colors.lightGreen, colors.black)

        y = drawText(page, 'ACCOUNTABILITY & PLANNING INDICATORS', 60, y, 10, true, colors.darkGreen)
        y -= 14

        drawText(page, `Verified Remittances: ${remittanceCount} | Total: KES ${totalRemittances.toLocaleString()}`, 60, y, 7)
        y -= 12
        drawText(page, `Supplementary Budgets Approved: ${supplementaryCount} | Total: KES ${supplementaryTotal.toLocaleString()}`, 60, y, 7)
        y -= 12
        
        const accountabilityStatus = isAccountableGrowth ? '[OK] Strong Accountability' : 
                                     hasReducedSupplementary ? '[OK] Improved Planning' : 'Normal Activity'
        drawText(page, `Status: ${accountabilityStatus}`, 60, y, 7, false, isAccountableGrowth ? colors.darkGreen : colors.darkGray)
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
        drawText(page, 'REPORT PERIOD SUMMARY & RECOMMENDATIONS:', 50, y, 11, true, colors.darkBlue)
        y -= 18

        // Calculate growth metrics
        const budgetGrowthTrend = reportData.budgetStats?.totalCount > 15 ? 'declining' : 'stable'
        const spendingHealth = utilizationNum > 100 ? 'over-spending' : utilizationNum > 80 ? 'healthy' : 'under-utilizing'
        const projectProgress = completedProjects > 0 ? 'positive' : 'needs activation'
        
        // Build contextual summary
        let summaryText = ''
        let recommendationColor = colors.darkGray
        
        if (utilizationNum > 100) {
          // Over-budget scenario
          summaryText = `[ALERT] ATTENTION REQUIRED: Budget utilization at ${utilizationRate}% indicates spending exceeds allocations. RECOMMENDATIONS: (1) Review supplementary budget approvals - ${supplementaryCount} approved this period. (2) Implement spending controls to prevent budget overruns. (3) Schedule budget rebalancing review. (4) Monitor monthly expenditures to stay within approved limits.`
          recommendationColor = colors.orange
        } else if (utilizationNum > 80) {
          // Healthy scenario
          summaryText = `[OK] POSITIVE GROWTH: Budget utilization at ${utilizationRate}% shows excellent fund management. With ${projectCompletionRate}% project completion and ${remittanceCount} verified remittances (KES ${totalRemittances.toLocaleString()}), the organization demonstrates strong accountability. RECOMMENDATIONS: (1) Maintain current spending discipline. (2) Continue project momentum with ${completedProjects} completed. (3) Consider allocating recovered funds to pending projects. (4) Document best practices for sustainability.`
          recommendationColor = colors.darkGreen
        } else if (utilizationNum > 50) {
          // Moderate scenario
          summaryText = `[OK] STEADY PROGRESS: Budget utilization at ${utilizationRate}% shows controlled spending. With ${projectCompletionRate}% project completion and reduced supplementary budgets (${supplementaryCount}), planning is improving. RECOMMENDATIONS: (1) Accelerate project implementations to increase utilization. (2) Review pending expenditure approvals. (3) Plan for underutilized budget allocation to active projects. (4) Strengthen project execution timelines.`
          recommendationColor = colors.darkBlue
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

    pages.forEach((p: any) => {
      // Add document-level shadow effect
      drawPageShadow(p)
      
      // Separator line
      p.drawLine({ start: { x: 50, y: 35 }, end: { x: 562, y: 35 }, thickness: 1, color: colors.lightGray })
      
      // Centered copyright
      const copyrightText = `(c) ${currentYear} Financial Control Panel. All Rights Reserved.`
      const confidentialText = 'This document is confidential and intended for authorized use only.'
      
      drawCenteredText(p, copyrightText, 25, 8, false, colors.mediumGray)
      drawCenteredText(p, confidentialText, 15, 8, false, colors.mediumGray)
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