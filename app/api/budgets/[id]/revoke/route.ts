import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id } = params
		const body = await request.json().catch(() => ({}))
		const { reason } = body

		const budget = await prisma.budget.findUnique({ where: { id } })

		if (!budget) {
			return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
		}

		// Only the creator or an admin can revoke
		if (session.user.role !== 'ADMIN' && budget.createdBy !== session.user.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const updated = await prisma.budget.update({
			where: { id },
			data: {
				status: 'REVOKED',
				updatedAt: new Date(),
			}
		})

		await prisma.auditLog.create({
			data: {
				action: 'BUDGET_REVOKED',
				entity: 'BUDGET',
				entityId: id,
				userId: session.user.id,
				changes: {
					from: budget.status,
					to: 'REVOKED',
					reason,
				}
			}
		})

		return NextResponse.json({ success: true, message: 'Budget revoked', budget: updated })
	} catch (error: any) {
		console.error('Budget revoke error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

