'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for NextAuth errors in the URL
  useEffect(() => {
    if (!searchParams) return
    
    const error = searchParams.get('error')
    if (error) {
      toast.error('Invalid email or password')
      // Remove the error from URL
      window.history.replaceState({}, document.title, '/auth/login')
    }
  }, [searchParams])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true)
      const lowercaseEmail = data.email.toLowerCase()
      console.log('📱 [LOGIN] Form submitted, attempting login for:', lowercaseEmail)

      // Use signIn with redirect: false so we can control the flow
      const result = await signIn('credentials', {
        email: lowercaseEmail,
        password: data.password,
        redirect: false, // Don't let NextAuth redirect, we'll handle it
      })

      console.log('📱 [LOGIN] signIn response:', { ok: result?.ok, error: result?.error, status: result?.status })

      if (!result?.ok || result?.error) {
        console.error('📱 [LOGIN] ❌ Authentication failed:', result?.error)
        toast.error(result?.error || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      console.log('📱 [LOGIN] ✓ Credentials validated by server, showing success message')
      toast.success('Logged in successfully')

      // CRITICAL: Wait for the session cookie to be set by NextAuth
      // The signIn() call completes before the Set-Cookie header is processed
      console.log('📱 [LOGIN] Waiting for session cookie to be written...')
      await new Promise((r) => setTimeout(r, 1500))

      console.log('📱 [LOGIN] Attempting to fetch session...')
      let sessionAttempt = 0
      let session: any = null

      // Try to get the session, with retries
      while (sessionAttempt < 5 && !session?.user) {
        try {
          console.log(`📱 [LOGIN] Session fetch attempt ${sessionAttempt + 1}/5...`)
          session = await getSession()
          
          if (session?.user) {
            console.log('📱 [LOGIN] ✓ Session retrieved:', {
              userId: session.user.id,
              email: session.user.email,
              role: session.user.role,
              isApproved: (session.user as any)?.isApproved,
            })
            break
          } else {
            console.log('📱 [LOGIN] No session yet, waiting...')
            await new Promise((r) => setTimeout(r, 500))
          }
        } catch (e) {
          console.error(`📱 [LOGIN] Error fetching session:`, e)
          await new Promise((r) => setTimeout(r, 500))
        }
        sessionAttempt++
      }

      if (!session?.user) {
        console.error('📱 [LOGIN] ❌ Could not get session after retries')
        toast.error('Session failed. Please refresh and try again.')
        setIsLoading(false)
        return
      }

      const role = (session.user.role || 'USER').toUpperCase()
      const isApproved = !!(session.user as any)?.isApproved

      console.log('📱 [LOGIN] Determined redirect target:', { role, isApproved })

      // Determine redirect path based on approval and role
      let redirectPath = '/dashboard/user/dashboard'
      
      if (!isApproved) {
        redirectPath = '/dashboard/pending-approval'
        console.log('📱 [LOGIN] User not approved, redirecting to:', redirectPath)
      } else if (role === 'ADMIN') {
        redirectPath = '/dashboard/admin/dashboard'
        console.log('📱 [LOGIN] Admin user, redirecting to:', redirectPath)
      } else {
        console.log('📱 [LOGIN] Regular user, redirecting to:', redirectPath)
      }

      // Give the browser time to fully process the session cookie before navigating
      await new Promise((r) => setTimeout(r, 500))

      console.log('📱 [LOGIN] Performing navigation to:', redirectPath)
      // Use location.href for a full page navigation to ensure middleware gets the session cookie
      window.location.href = redirectPath
      
    } catch (error) {
      console.error('📱 [LOGIN] ❌ Unexpected error in onSubmit:', error)
      console.error('📱 [LOGIN] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-slate-50 p-3 sm:p-4 md:p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-br from-blue-300/10 to-slate-300/5 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-tr from-blue-300/10 to-gray-300/5 rounded-full blur-3xl opacity-40 animate-pulse" />
      </div>

      {/* Main content with responsive width */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg relative z-10 responsive-container mx-auto px-2 sm:px-0">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 fade-in-cascade">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <span className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 bg-clip-text text-transparent">Financial Flow Monitor</span>
          </div>
          
          <h1 className="welcome-header text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Welcome back!</h1>
          <p className="text-sm sm:text-base text-gray-600">Sign in to manage finances</p>
        </div>

        {/* Login Card */}
        <Card className="fade-in-cascade border-blue-200/50 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm bg-white/95">
          <CardHeader className="pb-3 sm:pb-4 space-y-1 sm:space-y-2">
            <CardTitle className="text-xl sm:text-2xl text-gray-900">Sign in</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">Enter your credentials to access your account</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3 sm:space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="fade-in-cascade">
                      <FormLabel className="text-xs sm:text-sm font-medium text-gray-700">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Input Your Email"
                            disabled={isLoading}
                            className="input-animated pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="fade-in-cascade">
                      <FormLabel className="text-xs sm:text-sm font-medium text-gray-700">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            disabled={isLoading}
                            className="input-animated pl-9 sm:pl-10 pr-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-9 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm sm:text-base font-medium rounded-lg mt-4 sm:mt-6 btn-punch fade-in-cascade"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </form>
            </Form>

            {/* Sign up link and forgot password */}
            <div className="text-center pt-2 sm:pt-4 space-y-2">
              <button
                type="button"
                onClick={async () => {
                  const email = form.getValues('email')
                  if (!email) {
                    toast.error('Please enter your email address')
                    return
                  }

                  try {
                    const response = await fetch('/api/auth/reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    })

                    const data = await response.json()

                    if (response.ok) {
                      toast.success(`Password reset! New password: ${data.newPassword}`)
                    } else {
                      toast.error(data.error || 'Password reset failed')
                    }
                  } catch (error) {
                    console.error('Password reset error:', error)
                    toast.error('Password reset failed')
                  }
                }}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Forgot Password?
              </button>
              
              <p className="text-xs sm:text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 fade-in-cascade">
          <p>Secure login • Your data is encrypted</p>
        </div>
      </div>
    </div>
  )
}
