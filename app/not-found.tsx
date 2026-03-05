'use client'

import { useEffect, useState } from 'react'

export default function NotFound() {
  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    if (seconds <= 0) {
      window.location.href = 'https://www.xeuron.com'
      return
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground">
        Redirecting to{' '}
        <a href="https://www.xeuron.com" className="underline hover:text-foreground">
          xeuron.com
        </a>{' '}
        in {seconds} second{seconds !== 1 ? 's' : ''}…
      </p>
    </div>
  )
}
