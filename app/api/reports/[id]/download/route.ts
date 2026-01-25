import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const filePath = path.join(process.cwd(), 'public', report.filePath.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const file = fs.readFileSync(filePath)
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}.pdf"`,
      }
    })
  } catch (err: any) {
    console.error('Report download error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
