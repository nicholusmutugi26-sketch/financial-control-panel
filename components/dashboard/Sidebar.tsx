 'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Wallet, 
  FileText, 
  BarChart3, 
  Users,
  Settings,
  User,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  TrendingUp,
  CreditCard
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'USER'
    profileImage?: string | null
  }
}

const userNavItems = [
  { href: '/dashboard/user/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/user/budgets', label: 'Budgets', icon: Wallet },
  { href: '/dashboard/user/expenditures', label: 'Expenditures', icon: FileText },
  { href: '/dashboard/user/projects', label: 'Projects', icon: BarChart3 },
  { href: '/dashboard/user/statistics', label: 'Statistics', icon: TrendingUp },
  { href: '/dashboard/user/profile', label: 'Profile', icon: User },
]

const adminNavItems = [
  { href: '/dashboard/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/admin/budgets', label: 'Budgets', icon: Wallet },
  { href: '/dashboard/admin/expenditures', label: 'Expenditures', icon: FileText },
  { href: '/dashboard/admin/projects', label: 'Projects', icon: BarChart3 },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/statistics', label: 'Statistics', icon: TrendingUp },
  { href: '/dashboard/admin/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/dashboard/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { data: session, update } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  // Trust the server-passed `user.role` (provided by server layouts)
  const navRole = String(user.role || 'USER').toUpperCase().trim()
  const navItems = navRole === 'ADMIN' ? adminNavItems : userNavItems

  console.log('[Sidebar] Role:', navRole, '| Showing items:', navItems.map(i => i.label).join(', '))

  const NavItem = ({ href, label, icon: Icon }: typeof navItems[0]) => {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)
    
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all nav-item',
          isActive ? 'nav-gradient text-white font-medium shadow-md' : 'hover:bg-accent',
          collapsed && 'justify-center'
        )}
      >
        <Icon className={cn("h-4 w-4 icon", isActive && "text-white")} />
        {!collapsed && <span className={cn('label', isActive && 'text-white')}>{label}</span>}
      </Link>
    )
  }

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-bold">Financial Panel</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* User Profile */}
        <div className={cn(
          "border-b p-4",
          collapsed && "flex flex-col items-center"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            collapsed && "flex-col"
          )}>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImage || ''} alt={user.name} />
                <AvatarFallback>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
                <Badge className="mt-1" variant={
                  user.role === 'ADMIN' ? 'destructive' : 'secondary'
                }>
                  {user.role}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="border-t p-4">
          {user.role === 'ADMIN' && !collapsed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-2"
              asChild
            >
              <Link href={
                pathname?.startsWith('/dashboard/admin') 
                  ? '/dashboard/user/dashboard'
                  : '/dashboard/admin/dashboard'
              }>
                <Shield className="mr-2 h-4 w-4" />
                Switch to {pathname?.startsWith('/dashboard/admin') ? 'User' : 'Admin'}
              </Link>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", collapsed && "justify-center")}
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Log out"}
          </Button>
        </div>
      </div>
    </aside>
  )
}