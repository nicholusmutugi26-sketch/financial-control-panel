import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-4a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold text-white hidden sm:inline">Financial Panel</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button size="sm" variant="ghost" asChild className="text-blue-200 hover:text-white hover:bg-blue-700/30 text-xs sm:text-sm">
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl text-xs sm:text-sm font-medium">
              <Link href="/auth/register">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex-1 relative z-10">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-16 sm:mb-20 lg:mb-24">
          <div className="text-center fade-in-cascade">
            <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-500/20 border border-blue-400/40 backdrop-blur-sm">
              <span className="text-xs sm:text-sm font-semibold text-blue-200">✨ For Families & Partners</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight tracking-tight welcome-header">
              Financial Control
              <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                For Everyone
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-2xl text-blue-100 mb-6 sm:mb-8 lg:mb-10 max-w-3xl mx-auto leading-relaxed font-light px-2 sm:px-0">
              Real-time financial management designed for families and partners. Track budgets, manage expenditures, collaborate on projects, and maintain financial transparency in one secure place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 fade-in-cascade">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-2xl hover:shadow-3xl transition-all h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base btn-punch">
                <Link href="/auth/register">
                  Sign Up Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-2 border-blue-400 text-blue-200 hover:bg-blue-700/20 hover:text-blue-100 font-semibold shadow-lg hover:shadow-xl h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base">
                <Link href="/auth/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-20 lg:mb-24">
          {/* Card 1 */}
          <div className="group bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-md border border-blue-400/20 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-2 fade-in-cascade">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Budget Management</h3>
            <p className="text-blue-200 leading-relaxed text-sm sm:text-base">Create, approve, and track budgets with real-time updates. Get instant visibility into allocated vs. spent amounts with granular control.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-blue-300 font-semibold group-hover:text-blue-200 text-sm">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group bg-gradient-to-br from-violet-500/10 to-violet-600/5 backdrop-blur-md border border-violet-400/20 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:border-violet-400/40 transition-all duration-300 hover:-translate-y-2 fade-in-cascade">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Expense Tracking</h3>
            <p className="text-blue-200 leading-relaxed text-sm sm:text-base">Monitor expenditures with detailed item breakdown and approval workflows. Get instant alerts for overages and maintain perfect financial records.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-violet-300 font-semibold group-hover:text-violet-200 text-sm">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-md border border-cyan-400/20 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-2 fade-in-cascade">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Project Collaboration</h3>
            <p className="text-blue-200 leading-relaxed text-sm sm:text-base">Propose, vote, and manage projects with full team collaboration. Share updates, track progress, and make decisions together seamlessly.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-cyan-300 font-semibold group-hover:text-cyan-200 text-sm">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="max-w-5xl mx-auto mb-16 sm:mb-20 lg:mb-24 fade-in-cascade">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">10+</div>
              <p className="text-blue-200 text-sm sm:text-base">Users Managing Finances</p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">$1M+</div>
              <p className="text-blue-200 text-sm sm:text-base">Total Transactions Tracked</p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">99.9%</div>
              <p className="text-blue-200 text-sm sm:text-base">System Uptime Guaranteed</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto text-center py-12 sm:py-16 lg:py-20 fade-in-cascade">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">Ready to take control?</h2>
          <p className="text-blue-100 mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg">Start managing your finances today with our secure, easy-to-use platform.</p>
          <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold shadow-2xl hover:shadow-3xl transition-all h-12 px-8 text-base btn-punch">
            <Link href="/auth/register">
              Sign Up Now
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-blue-700/30 bg-slate-900/50 backdrop-blur-md mt-12 sm:mt-16 lg:mt-20 py-8 sm:py-12 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-300 text-sm">
          <p className="mb-2">© 2026 Financial Control Panel. All rights reserved.</p>
          <p className="text-xs sm:text-sm text-blue-400">Secure • Fast • Reliable</p>
        </div>
      </footer>
    </div>
  )
}
