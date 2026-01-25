import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function Page({ params }: { params: { id: string } }) {
	const session = await getServerSession(authOptions)

	if (!session || session.user.role !== 'ADMIN') {
		redirect('/auth/login')
	}

	const { id } = params

	const expenditure = await prisma.expenditure.findUnique({
		where: { id },
		include: {
			user: { select: { id: true, name: true, email: true, profileImage: true } },
			budget: { select: { id: true, title: true } },
			items: { orderBy: { amount: 'desc' } }
		}
	})

	if (!expenditure) {
		return (
			<div className="py-20 text-center">
				<h1 className="text-xl font-bold">Expenditure not found</h1>
				<p className="mt-2 text-gray-600">The requested expenditure does not exist.</p>
				<div className="mt-4">
					<Button asChild>
						<Link href="/dashboard/admin/expenditures">Back to expenditures</Link>
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Expenditure Details</h1>
					<p className="text-gray-600">Viewing expenditure (read-only)</p>
				</div>
				<div>
					<Button asChild>
						<Link href="/dashboard/admin/expenditures">Back</Link>
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{expenditure.title}</CardTitle>
					<CardDescription>
						{expenditure.user?.name} • {expenditure.user?.email}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-gray-500">Amount</p>
							<p className="text-lg font-medium">{formatCurrency(expenditure.amount)}</p>

							<p className="mt-4 text-sm text-gray-500">Status</p>
							<p className="font-medium">{expenditure.status}</p>

							<p className="mt-4 text-sm text-gray-500">Created</p>
							<p className="font-medium">{formatDate(expenditure.createdAt)}</p>
						</div>

						<div>
							<p className="text-sm text-gray-500">Budget</p>
							<p className="font-medium">{expenditure.budget?.title || '—'}</p>

							<p className="mt-4 text-sm text-gray-500">Description</p>
							<p className="text-sm text-gray-700 whitespace-pre-wrap">{expenditure.description || 'No description provided.'}</p>
						</div>
					</div>

					<div className="mt-6">
						<h3 className="text-sm font-medium">Items</h3>
						<div className="mt-2 space-y-2">
							{expenditure.items.length === 0 && (
								<p className="text-sm text-gray-500">No items</p>
							)}
							{expenditure.items.map((item) => (
								<div key={item.id} className="flex items-center justify-between">
									<div>
										<p className="font-medium">{item.name}</p>
									<p className="text-sm text-gray-500">{formatCurrency(item.amount)}</p>
								</div>
								<div className="text-sm text-gray-700">{formatCurrency(item.amount)}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
