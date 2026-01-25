'use client'

import { useEffect } from 'react'

export default function PWAScript() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60000) // Check every minute
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })

      // Listen for updates
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }

    // Handle install prompt
    let deferredPrompt: any = null

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('Install prompt is ready')
    })

    // Optional: Auto-show install prompt after some time
    // Uncomment if you want to auto-prompt users
    /*
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (deferredPrompt) {
          deferredPrompt.prompt()
          deferredPrompt = null
        }
      }, 5000)
    })
    */

    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully')
      deferredPrompt = null
    })
  }, [])

  return null
}
