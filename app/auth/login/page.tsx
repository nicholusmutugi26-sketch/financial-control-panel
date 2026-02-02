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
      console.log('📱 [LOGIN] Attempting login for:', lowercaseEmail)

      // Call signIn with redirect: false to handle navigation ourselves
      // This gives us full control over when and where we redirect
      const result = await signIn('credentials', {
        email: lowercaseEmail,
        password: data.password,
        redirect: false,
      })

      console.log('📱 [LOGIN] signIn result:', { ok: result?.ok, error: result?.error, status: result?.status })

      if (!result?.ok || result?.error) {
        console.error('📱 [LOGIN] ❌ Credentials invalid')
        toast.error('Invalid email or password')
        setIsLoading(false)
        return
      }

      console.log('📱 [LOGIN] ✓ Credentials accepted by server, waiting for session...')

      // CRITICAL: Wait longer before checking for session
      // NextAuth needs time to:
      // 1. Run all callbacks (jwt, session, redirect)
      // 2. Set the session cookie on the client
      // On Vercel this can take longer due to network latency
      await new Promise((r) => setTimeout(r, 800))

      // Poll for session multiple times with longer interval
      let session: any = null
      const maxAttempts = 15 // 15 * 300ms = 4.5 seconds total
      let attempt = 0

      while (attempt < maxAttempts && (!session || !session.user)) {
        attempt++
        console.log(`📱 [LOGIN] Polling for session (attempt ${attempt}/${maxAttempts})...`)
        
        // eslint-disable-next-line no-await-in-loop
        session = await getSession()
        
        if (session && session.user) {
          console.log(`📱 [LOGIN] ✓ Session acquired on attempt ${attempt}`)
          break
        }

        if (attempt < maxAttempts) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      if (!session || !session.user) {
        console.error('📱 [LOGIN] ❌ Session not established after all attempts')
        toast.error('Login failed: session not established. Please try again.')
        setIsLoading(false)
        return
      }

      console.log('📱 [LOGIN] ✓ Session confirmed:', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isApproved: session.user.isApproved,
      })

      // Route based on role and approval
      const role = (session.user.role || 'USER').toUpperCase()
      const isApproved = !!(session.user?.isApproved)

      console.log('📱 [LOGIN] ✓ Session ready, determining redirect path...', { role, isApproved })

      // Show success message
      toast.success('Logged in successfully')

      // Wait additional time to ensure browser has persisted the session cookie
      // before we navigate away from the login page
      await new Promise((r) => setTimeout(r, 500))

      if (!isApproved) {
        console.log('📱 [LOGIN] Redirecting to pending-approval (user not approved)')
        router.push('/dashboard/pending-approval')
        return
      }

      if (role === 'ADMIN') {
        console.log('📱 [LOGIN] Redirecting to admin dashboard')
        router.push('/dashboard/admin/dashboard')
        return
      }

      console.log('📱 [LOGIN] Redirecting to user dashboard')
      router.push('/dashboard/user/dashboard')
    } catch (error) {
      console.error('📱 [LOGIN] ❌ Login error:', error)
      toast.error('Something went wrong')
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
