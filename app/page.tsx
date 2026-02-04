import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import InstallButton from '@/components/InstallButton'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-40 animate-pulse" />
      </div>

      {/* Navigation bar */}
      <nav className="border-b border-blue-700/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold text-lg">Finances Flow Monitor</span>
          </div>
          <div className="flex items-center space-x-3">
            <InstallButton />         
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex-1 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-8 sm:mb-12 lg:mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Take Control of Your
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Financial Future
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-200 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Manage budgets, track expenses, and collaborate with family in real-time.
              Secure and intuitive.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl px-8 py-3 text-base font-semibold">
                <Link href="/auth/register">
                  Sign Up
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-blue-400 text-blue-300 hover:bg-blue-400/10 hover:text-white px-8 py-3 text-base font-semibold">
                <Link href="/auth/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="bg-slate-800/50 backdrop-blur-md border border-blue-700/30 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Smart Budgeting</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Create and manage budgets with real-time tracking and intelligent insights.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-blue-700/30 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Family Collaboration</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Share budgets and expenses with family members in real-time.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-blue-700/30 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-time Tracking</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Monitor expenses and budgets with instant updates and notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="border-t border-blue-700/30 bg-slate-900/50 backdrop-blur-md mt-12 sm:mt-16 lg:mt-20 py-8 sm:py-12 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-300 text-sm">
          <p className="mb-2">© 2026 Financial Control Panel. All rights reserved.</p>
          <p className="text-xs sm:text-sm text-blue-400">Secure • Private • Family-Focused</p>
        </div>
      </footer>
    </div>
  )
}
