import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck,
  Mail,
  Phone
} from 'lucide-react'
import Link from 'next/link'
import UserActions from '@/components/admin/UserActions'
import PendingUsersApproval from '@/components/admin/PendingUsersApproval'
import { formatDate } from '@/lib/utils'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const users = await prisma.user.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      profileImage: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          budgets: true,
          expenditures: true,
          projects: true,
        }
      }
    }
  })

  const pendingUsers = await prisma.user.findMany({
    where: { isApproved: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
    }
  })

  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_count,
      COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_count,
      COUNT(CASE WHEN "lastLogin" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users
    FROM "User"
    WHERE "isApproved" = true
  ` as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-gray-600">
            Manage system users and their permissions
          </p>
        </div>
        {/* Invite feature removed per admin settings */}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[0].total_users}</div>
            <p className="text-xs text-gray-500">
              {stats[0].active_users} active last 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[0].admin_count}</div>
            <p className="text-xs text-gray-500">
              System administrators
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <UserCheck className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[0].user_count}</div>
            <p className="text-xs text-gray-500">
              Standard system users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <UserPlus className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-xs text-gray-500">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <PendingUsersApproval pendingUsers={pendingUsers} />
      )}

      {/* Administrators Section */}
      {users.filter(u => u.role === 'ADMIN').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Administrators</CardTitle>
            <CardDescription>
              Users with full system access and management capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.filter(u => u.role === 'ADMIN').map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-purple-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.profileImage ? (
                        <img 
                          src={user.profileImage} 
                          alt={user.name || 'User'}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="font-semibold">
                          {(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name || 'Unnamed'}</h3>
                        <Badge className="bg-purple-100 text-purple-800">ADMIN</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Budgets: {user._count.budgets}</span>
                        <span>Expenditures: {user._count.expenditures}</span>
                        <span>Projects: {user._count.projects}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Joined {formatDate(user.createdAt)}
                    </div>
                    <UserActions userId={user.id} role={user.role || 'USER'} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Users Section */}
      {users.filter(u => u.role === 'USER').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Regular Users</CardTitle>
            <CardDescription>
              Standard system users with limited permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.filter(u => u.role === 'USER').map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.profileImage ? (
                        <img 
                          src={user.profileImage} 
                          alt={user.name || 'User'}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="font-semibold">
                          {(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">USER</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Budgets: {user._count.budgets}</span>
                        <span>Expenditures: {user._count.expenditures}</span>
                        <span>Projects: {user._count.projects}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Joined {formatDate(user.createdAt)}
                    </div>
                    <UserActions userId={user.id} role={user.role || 'USER'} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}