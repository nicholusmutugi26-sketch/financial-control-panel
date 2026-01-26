'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Shield,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { usePathname } from 'next/navigation'

interface UserMenuProps {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'USER'
    profileImage?: string | null
  }
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [notifications] = useState(3) // Mock notifications count

  return (
    <div className="flex items-center gap-4">
      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {notifications}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            <div className="p-4 text-sm">
              <p className="font-medium">Budget Approved</p>
              <p className="text-gray-500">Your budget "Office Supplies" has been approved</p>
              <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
            </div>
            <DropdownMenuSeparator />
            <div className="p-4 text-sm">
              <p className="font-medium">Disbursement Received</p>
              <p className="text-gray-500">KES 15,000 has been disbursed to your M-Pesa</p>
              <p className="text-xs text-gray-400 mt-1">1 day ago</p>
            </div>
            <DropdownMenuSeparator />
            <div className="p-4 text-sm">
              <p className="font-medium">Project Voting Started</p>
              <p className="text-gray-500">"Website Redesign" project is now open for voting</p>
              <p className="text-xs text-gray-400 mt-1">3 days ago</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="#" className="cursor-pointer justify-center">
              View all notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImage || ''} alt={user.name} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
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
          </DropdownMenuGroup>
          
          {user.role === 'ADMIN' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={
                    pathname?.startsWith('/dashboard/admin') 
                      ? '/dashboard/user/dashboard'
                      : '/dashboard/admin/dashboard'
                  } className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Switch to {pathname?.startsWith('/dashboard/admin') ? 'User' : 'Admin'}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={async () => {
              // Clear all session data on logout
              await signOut({ 
                callbackUrl: '/auth/login',
                redirect: true 
              })
              // Force page refresh to clear any cached session state
              window.location.href = '/auth/login'
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}