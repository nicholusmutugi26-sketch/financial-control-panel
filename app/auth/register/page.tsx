'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react'
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
import { validatePhoneNumber } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phoneNumber: z.string().refine(validatePhoneNumber, {
    message: 'Please enter a valid Kenyan phone number (254XXXXXXXXX)',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phoneNumber: data.phoneNumber,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      // Attempt to sign the user in immediately after registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        toast.success('Account created successfully! Please sign in.')
        router.push('/auth/login')
        return
      }

      toast.success('Account created and signed in! Redirecting...')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-4a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 bg-clip-text text-transparent">Financial Panel</span>
          </div>
          
          <h1 className="welcome-header text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-sm sm:text-base text-gray-600">Join us and start managing finances today</p>
        </div>

        {/* Register Card */}
        <Card className="fade-in-cascade border-blue-200/50 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm bg-white/95">
          <CardHeader className="pb-3 sm:pb-4 space-y-1 sm:space-y-2">
            <CardTitle className="text-xl sm:text-2xl text-gray-900">Sign up</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">Fill in your details to create a new account</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3 sm:space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="fade-in-cascade">
                      <FormLabel className="text-xs sm:text-sm font-medium text-gray-700">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="John Doe"
                            disabled={isLoading}
                            className="input-animated pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

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
                            placeholder="you@example.com"
                            disabled={isLoading}
                            className="input-animated pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="fade-in-cascade">
                      <FormLabel className="text-xs sm:text-sm font-medium text-gray-700">Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="254712345678"
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
                            placeholder="Enter a secure password"
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

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="fade-in-cascade">
                      <FormLabel className="text-xs sm:text-sm font-medium text-gray-700">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            disabled={isLoading}
                            className="input-animated pl-9 sm:pl-10 pr-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
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
                  {isLoading ? 'Creating account...' : 'Create Account'}
                  {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </form>
            </Form>

            {/* Sign in link */}
            <div className="text-center pt-2 sm:pt-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 fade-in-cascade">
          <p>Secure registration • Your data is encrypted</p>
        </div>
      </div>
    </div>
  )
}
