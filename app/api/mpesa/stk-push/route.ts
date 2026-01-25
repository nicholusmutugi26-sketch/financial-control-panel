import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null)

		// Placeholder endpoint: integrate with mpesaService in lib/mpesa.ts
		console.log('STK Push requested', body)

		return NextResponse.json({ success: true, message: 'STK push endpoint not fully implemented yet' })
	} catch (error: any) {
		console.error('STK push error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
