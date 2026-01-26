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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-blue-800">
      {/* Navigation bar */}
      <nav className="border-b border-blue-700/30 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-4a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Financial Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" asChild className="text-blue-200 hover:text-white hover:bg-blue-700/30">
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl">
              <Link href="/auth/register">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto text-center mb-20">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/40 backdrop-blur-sm">
            <span className="text-sm font-semibold text-blue-200">For Families & Partners</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Financial Control
            <span className="block bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              For Everyone
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed font-light">
            Real-time financial management designed for families and partners. 
            Track budgets, manage expenditures, collaborate on projects, and maintain financial transparency in one secure place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-2xl hover:shadow-3xl transition-all h-12 px-8 text-base">
              <Link href="/auth/register">
                Sign Up Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-2 border-blue-400 text-blue-200 hover:bg-blue-700/20 hover:text-blue-100 font-semibold shadow-lg hover:shadow-xl h-12 px-8 text-base">
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Card 1 */}
          <div className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-md border border-blue-400/20 p-8 rounded-2xl shadow-2xl hover:shadow-3xl hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Budget Management</h3>
            <p className="text-blue-200 leading-relaxed">Create, approve, and track budgets with real-time updates. Get instant visibility into allocated vs. spent amounts with granular control.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-blue-300 font-semibold group-hover:text-blue-200">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-md border border-green-400/20 p-8 rounded-2xl shadow-2xl hover:shadow-3xl hover:border-green-400/40 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Expense Tracking</h3>
            <p className="text-blue-200 leading-relaxed">Monitor expenditures with detailed item breakdown and approval workflows. Get instant alerts for overages and maintain perfect financial records.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-green-300 font-semibold group-hover:text-green-200">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-md border border-purple-400/20 p-8 rounded-2xl shadow-2xl hover:shadow-3xl hover:border-purple-400/40 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Project Collaboration</h3>
            <p className="text-blue-200 leading-relaxed">Propose, vote, and manage projects with full team collaboration. Share updates, track progress, and make decisions together seamlessly.</p>
            <div className="mt-6 pt-6 border-t border-blue-400/20 flex items-center text-purple-300 font-semibold group-hover:text-purple-200">
              Learn more
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-400/30 rounded-2xl p-12 text-center shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6">Trusted by Families Worldwide</h2>
          <div className="grid grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-4xl font-bold text-blue-300 mb-2">1000+</div>
              <p className="text-blue-100">Active Families</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-300 mb-2">₪100M</div>
              <p className="text-blue-100">Managed Together</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-300 mb-2">99.9%</div>
              <p className="text-blue-100">Uptime</p>
            </div>
          </div>
          <p className="text-blue-100 text-lg">Enterprise-grade security with bank-level encryption for your complete peace of mind.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-blue-700/30 bg-slate-900/50 backdrop-blur-sm mt-20 py-12">
        <div className="container mx-auto px-4 text-center text-blue-300">
          <p className="mb-4">© 2026 Financial Control Panel. All rights reserved.</p>
          <p className="text-blue-400 text-sm">Designed for families and partners who value financial transparency.</p>
        </div>
      </footer>
    </div>
  )
}
