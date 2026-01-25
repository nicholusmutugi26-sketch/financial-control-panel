import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null)

		// Optionally handle callback payload (persisting requires a model)
		console.log('Mpesa callback received', body)

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Mpesa callback error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
