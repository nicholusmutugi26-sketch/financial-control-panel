'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
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
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 bg-clip-text text-transparent">Welcome Back</h1>
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Your secure financial dashboard awaits
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-2 border-gradient-to-r from-indigo-200 to-purple-200 bg-white/95 backdrop-blur-2xl shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="space-y-2 pb-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-2xl bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Sign In</CardTitle>
            </div>
            <CardDescription className="text-slate-600 font-medium">
              Enter your credentials to access your account
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

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-violet-400/40 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed text-base"
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
                        <span>Sign In Securely</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-600 font-semibold">Don't have an account?</span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <Link href="/auth/register" className="w-full inline-block">
                  <Button
                    type="button"
                    className="w-full h-11 border-2 border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 font-bold transition-all duration-200 text-base"
                  >
                    Create Account
                  </Button>
                </Link>
              </form>
            </Form>

            {/* Demo credentials */}
            <div className="mt-6 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-300">
              <p className="text-xs font-semibold text-slate-700 mb-1">Demo Credentials:</p>
              <p className="text-xs text-slate-600"><span className="font-mono bg-indigo-100 px-2 py-1 rounded">admin@financialpanel.com</span></p>
              <p className="text-xs text-slate-600"><span className="font-mono bg-indigo-100 px-2 py-1 rounded">admin@financialpanel@2026</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">🔒</div>
            <p className="text-xs text-slate-700 font-semibold mt-1">256-bit Encrypted</p>
          </div>
          <div>
            <div className="text-2xl font-bold">✓</div>
            <p className="text-xs text-slate-700 font-semibold mt-1">Secure & Fast</p>
          </div>
          <div>
            <div className="text-2xl font-bold">⭐</div>
            <p className="text-xs text-slate-700 font-semibold mt-1">Trusted by Many</p>
          </div>
        </div>

       
      </div>
    </div>
  )
}
