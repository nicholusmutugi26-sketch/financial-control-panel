"use client"

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export default function PoolAmount({ amount }: { amount: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf = 0
    const duration = 1500
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const value = Math.round(progress * amount)
      setDisplay(value)
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [amount])

  return (
    <div className="flex flex-col items-center w-full px-2">
      <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-300 flex items-center gap-2 sm:gap-3 flex-wrap justify-center font-poppins">
        <span className="break-words">{formatCurrency(display)}</span>
        <span className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse flex-shrink-0" aria-hidden />
      </div>
    </div>
  )
}
