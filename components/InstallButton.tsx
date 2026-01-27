'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Smartphone } from 'lucide-react'

export default function InstallButton() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    const checkInstalled = () => {
      if ('standalone' in window.navigator && (window.navigator as any).standalone) {
        // iOS Safari in standalone mode
        setIsInstallable(false)
      } else if (window.matchMedia('(display-mode: standalone)').matches) {
        // Android/Chrome in standalone mode
        setIsInstallable(false)
      } else {
        // Check if install prompt is available
        setIsInstallable(!!deferredPrompt)
      }
    }

    checkInstalled()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [deferredPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setIsInstallable(false)
      }

      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleIOSInstall = () => {
    alert('To install this app on iOS:\n\n1. Tap the Share button (📤)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right corner')
  }

  if (!isInstallable && !isIOS) return null

  return (
    <Button
      onClick={isIOS ? handleIOSInstall : handleInstall}
      variant="outline"
      size="sm"
      className="border-blue-400 text-blue-300 hover:bg-blue-400/10 hover:text-white flex items-center gap-2"
    >
      {isIOS ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      Install App
    </Button>
  )
}