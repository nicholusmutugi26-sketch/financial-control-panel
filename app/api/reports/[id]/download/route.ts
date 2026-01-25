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

    // Generate PDF on-demand with report metadata and financial data
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

    // Generate simple PDF report
    let page = addNewPage()
    let y = 780

    // Header
    drawFilledBox(page, 0, 700, 612, 80, colors.darkBlue)
    y = 760
    drawCenteredText(page, 'FINANCIAL CONTROL PANEL', y, 18, true, colors.white)
    y = 730
    drawCenteredText(page, `${report.type.toUpperCase()} REPORT`, y, 14, true, colors.white)

    // Report Details
    y = 670
    drawText(page, 'Report Details:', 50, y, 10, true, colors.darkBlue)
    y -= 16
    drawText(page, `Period: ${report.period || 'N/A'}`, 60, y, 9)
    y -= 14
    drawText(page, `Report ID: ${report.id}`, 60, y, 9)
    y -= 14
    drawText(page, `Generated: ${new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, y, 8)
    y -= 12
    drawText(page, `Prepared by: ${report.user?.name || 'System'} (${report.user?.email || 'system@financialpanel.com'})`, 60, y, 8)

    // Summary Section
    y -= 25
    drawText(page, 'REPORT SUMMARY', 50, y, 10, true, colors.darkBlue)
    y -= 16
    drawText(page, 'This report was generated from the Financial Control Panel system.', 60, y, 8)
    y -= 12
    drawText(page, `Report Type: ${report.type}`, 60, y, 8)
    y -= 12
    drawText(page, `Generated for period: ${report.period || 'Current'}`, 60, y, 8)

    // Footer
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
