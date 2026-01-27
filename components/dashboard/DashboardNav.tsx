'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  Home, 
  Wallet, 
  FileText, 
  BarChart3, 
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/dashboard/NotificationBell'

interface DashboardNavProps {
  user: {
    id: string
    name: string | null
    email: string
    role: string | null
    profileImage?: string | null
  }
}

const userNavItems = [
  { href: '/dashboard/user/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/user/budgets', label: 'Budgets', icon: Wallet },
  { href: '/dashboard/user/expenditures', label: 'Expenditures', icon: FileText },
  { href: '/dashboard/user/projects', label: 'Projects', icon: BarChart3 },
  { href: '/dashboard/user/statistics', label: 'Statistics', icon: BarChart3 },
  { href: '/dashboard/user/profile', label: 'Profile', icon: User },
]

const adminNavItems = [
  { href: '/dashboard/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/admin/budgets', label: 'Budgets', icon: Wallet },
  { href: '/dashboard/admin/expenditures', label: 'Expenditures', icon: FileText },
  { href: '/dashboard/admin/projects', label: 'Projects', icon: BarChart3 },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/statistics', label: 'Statistics', icon: BarChart3 },
  { href: '/dashboard/admin/transactions', label: 'Transactions', icon: FileText },
  { href: '/dashboard/admin/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
]

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const { data: session, update } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const navItems = user.role === 'ADMIN' ? adminNavItems : userNavItems

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Update session data
      await update()
      
      // Refresh the page data by triggering a soft reload
      window.location.reload()
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const NavItem = ({ href, label, icon: Icon }: typeof navItems[0]) => {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)
    
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-sky-50',
          isActive ? 'bg-sky-600/10 text-sky-700 font-semibold' : 'text-gray-700'
        )}
      >
        <Icon className={cn('h-4 w-4', isActive ? 'text-sky-600' : 'text-gray-500')} />
        {label}
      </Link>
    )
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <div className="px-7">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Financial Panel</span>
              </Link>
            </div>
            <div className="mt-8 space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                      active ? 'bg-sky-600/10 text-sky-700 font-semibold' : 'hover:bg-sky-50 text-gray-700'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', active ? 'text-sky-600' : 'text-gray-500')} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo and Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Financial Panel</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
            title="Refresh data"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          {/* Notifications Bell */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImage || ''} alt={user.name || 'User'} />
                  <AvatarFallback>
                    {(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/user/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/user/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}