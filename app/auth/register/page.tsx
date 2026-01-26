'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Animated background elements - bright and vibrant */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-violet-400/20 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/30 to-indigo-400/20 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-300/20 to-indigo-300/20 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Header with Sparkles */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 shadow-2xl mb-4 animate-bounce">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 bg-clip-text text-transparent">Get Started</h1>
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Join thousands managing finances securely
          </p>
        </div>

        {/* Register Card */}
        <Card className="border-2 border-gradient-to-r from-indigo-200 to-purple-200 bg-white/95 backdrop-blur-2xl shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="space-y-2 pb-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-2xl bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Create Account</CardTitle>
            </div>
            <CardDescription className="text-slate-600 font-medium">
              Set up your secure financial account in minutes
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600 pointer-events-none" />
                          <Input
                            placeholder="John Doe"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300/50 transition-all h-11 font-medium"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300/50 transition-all h-11 font-medium"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold text-sm">Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600 pointer-events-none" />
                          <Input
                            placeholder="254712345678"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300/50 transition-all h-11 font-medium"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 font-semibold text-sm">Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                          disabled={isLoading}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600 pointer-events-none" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 pr-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300/50 transition-all h-11 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-not-allowed"
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 font-semibold text-sm">Confirm Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600 pointer-events-none" />
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 pr-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300/50 transition-all h-11 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-not-allowed"
                            disabled={isLoading}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-violet-400/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed text-base mt-6"
                  disabled={isLoading}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-600 font-semibold">Already have an account?</span>
              </div>
            </div>

            {/* Sign In Link */}
            <Link href="/auth/login" className="w-full inline-block">
              <Button
                type="button"
                className="w-full h-11 border-2 border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 font-bold transition-all duration-200 text-base"
              >
                Sign In Instead
              </Button>
            </Link>

            {/* Security features */}
            <div className="mt-6 space-y-2 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-slate-700 font-semibold">Secure password encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-slate-700 font-semibold">Admin approval required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-slate-700 font-semibold">Your data is protected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust badge */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 font-medium">
            ✨ Trusted by financial professionals • 🔒 Enterprise-grade security • ⚡ Lightning fast
          </p>
        </div>
      </div>
    </div>
  )
}
