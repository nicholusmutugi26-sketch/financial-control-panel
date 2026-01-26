import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'sonner'
import PWAScript from '@/components/PWAScript'

const inter = Inter({ 
  subsets: ['latin'],
  fallback: ['system-ui', 'arial', 'sans-serif']
})

export const metadata: Metadata = {
  title: 'Financial Control Panel',
  description: 'Real-time financial management for families and partners',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Financial Control Panel',
  },
  icons: [
    { rel: 'icon', url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon', url: '/icon-192x192.svg' },
    { rel: 'icon', url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    { rel: 'icon', url: '/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Financial Control Panel" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            richColors
            closeButton
            expand={false}
          />
        </Providers>
        <PWAScript />
      </body>
    </html>
  )
}