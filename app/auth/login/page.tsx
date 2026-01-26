'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
      
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
        return
      }

      toast.success('Logged in successfully')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-slate-50 p-4 relative overflow-hidden">
      {/* Animated background elements - professional and subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-slate-300/5 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-300/10 to-gray-300/5 rounded-full blur-3xl opacity-40 animate-pulse" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm font-medium">
            Sign in to your financial dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-6 border-b border-gray-100">
            <CardTitle className="text-2xl text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email and password to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-semibold text-sm">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all h-11"
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
                        <FormLabel className="text-gray-700 font-semibold text-sm">Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          disabled={isLoading}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            disabled={isLoading}
                            className="pl-10 pr-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
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

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  disabled={isLoading}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-gray-600 font-medium">New to our platform?</span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <Link href="/auth/register" className="w-full inline-block">
                  <Button
                    type="button"
                    className="w-full h-11 border border-gray-300 hover:border-blue-500 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-semibold transition-all duration-200 text-base"
                  >
                    Create Account
                  </Button>
                </Link>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
