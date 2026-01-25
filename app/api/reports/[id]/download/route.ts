import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFDocument as PDFLibDocument, StandardFonts, rgb } from 'pdf-lib'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow both ADMIN and USER roles to download reports
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      )
    }

    const { id } = params
    const report = await prisma.report.findUnique({ 
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })
    
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const reportData = report.data as any || {}

    // Generate PDF with stored report data
    const pdfDoc = await PDFLibDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

    const colors = {
      darkBlue: rgb(0.05, 0.2, 0.4),
      mediumBlue: rgb(0.15, 0.35, 0.6),
      lightBlue: rgb(0.35, 0.48, 0.65),
      darkGreen: rgb(0.0, 0.35, 0.1),
      lightGreen: rgb(0.35, 0.50, 0.35),
      orange: rgb(0.95, 0.65, 0.1),
      red: rgb(0.8, 0.2, 0.2),
      darkGray: rgb(0.15, 0.15, 0.15),
      mediumGray: rgb(0.4, 0.4, 0.4),
      lightGray: rgb(0.45, 0.45, 0.50),
      black: rgb(0, 0, 0),
      white: rgb(1, 1, 1),
    }

    const addNewPage = () => pdfDoc.addPage([612, 792])

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

    const drawFilledBox = (page: any, x: number, y: number, width: number, height: number, fillColor: any) => {
      page.drawRectangle({ x, y, width, height, color: fillColor, borderWidth: 0 })
    }

    const drawSectionBorder = (page: any, x: number, y: number, width: number) => {
      page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1.5, color: colors.darkBlue })
    }

    // PAGE 1: COVER & SUMMARY
    let page = addNewPage()
    let y = 780

    drawFilledBox(page, 0, 700, 612, 80, colors.darkBlue)
    y = 760
    drawCenteredText(page, 'FINANCIAL CONTROL PANEL', y, 18, true, colors.white)
    y = 730
    drawCenteredText(page, `${report.type.toUpperCase()} REPORT`, y, 14, true, colors.white)

    y = 670
    drawText(page, 'Report Details:', 50, y, 10, true, colors.darkBlue)
    y -= 16
    drawText(page, `Period: ${reportData.period || report.period || 'N/A'}`, 60, y, 9)
    y -= 14
    drawText(page, `Generated: ${new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, y, 8)
    y -= 12
    drawText(page, `Prepared by: ${report.user?.name || 'Admin'} (${report.user?.email || 'admin'})`, 60, y, 8)

    // FINANCIAL SUMMARY SECTION
    y -= 20
    drawText(page, 'FINANCIAL SUMMARY', 60, y, 10, true, colors.darkBlue)
    y -= 15

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
      y -= 20
    }

    // KEY METRICS SECTION
    drawText(page, 'KEY METRICS', 60, y, 10, true, colors.darkGreen)
    y -= 14

    if (reportData.budgetStats) {
      drawText(page, `Budgets: ${reportData.budgetStats.totalCount || 0}`, 60, y, 8)
      y -= 10
    }

    if (reportData.expenditureStats) {
      drawText(page, `Expenditures: ${reportData.expenditureStats.totalCount || 0}`, 60, y, 8)
      y -= 10
    }

    if (reportData.transactionStats) {
      drawText(page, `Transactions: ${reportData.transactionStats.totalCount || 0}`, 60, y, 8)
      y -= 10
    }

    // PAGE 2: DETAILED LISTINGS
    if ((reportData.budgets && reportData.budgets.length > 0) || (reportData.expenditures && reportData.expenditures.length > 0)) {
      page = addNewPage()
      y = 780

      drawFilledBox(page, 0, 710, 612, 40, colors.darkBlue)
      drawCenteredText(page, 'DETAILED BUDGET & EXPENDITURE LISTING', 728, 13, true, colors.white)
      y = 700

      // Budgets
      if (reportData.budgets && reportData.budgets.length > 0) {
        y = drawText(page, 'BUDGETS', 50, y, 10, true, colors.darkBlue)
        y -= 12

        for (let i = 0; i < Math.min(reportData.budgets.length, 12); i++) {
          const budget = reportData.budgets[i]
          if (y < 150) break

          y = drawText(page, `${i + 1}. ${budget.title}`, 60, y, 9, true, colors.darkGreen)
          y = drawText(page, `KES ${(budget.amount || 0).toLocaleString()}`, 60, y, 8)
          y -= 12
        }
      }

      // Expenditures
      if (reportData.expenditures && reportData.expenditures.length > 0) {
        let ry = 700
        ry = drawText(page, 'EXPENDITURES', 330, ry, 10, true, colors.darkBlue)
        ry -= 12

        for (let i = 0; i < Math.min(reportData.expenditures.length, 12); i++) {
          const exp = reportData.expenditures[i]
          if (ry < 150) break

          ry = drawText(page, `${i + 1}. ${exp.title}`, 340, ry, 9, true, colors.darkGreen)
          ry = drawText(page, `KES ${(exp.amount || 0).toLocaleString()}`, 340, ry, 8)
          ry -= 12
        }
      }
    }

    // Add footer to all pages
    const pages = pdfDoc.getPages()
    pages.forEach((p) => {
      p.drawLine({ start: { x: 50, y: 35 }, end: { x: 562, y: 35 }, thickness: 1, color: colors.lightGray })
      const copyrightText = `© ${new Date().getFullYear()} Financial Control Panel. All Rights Reserved.`
      drawCenteredText(p, copyrightText, 25, 8, false, colors.mediumGray)
    })

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  } catch (err: any) {
    console.error('Report download error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
