'use client'

import { useEffect, useState } from 'react'

interface Props {
  eventDate: string
  startDate?: string | null
  endDate?: string | null
}

function getDiffLabel(eventDate: string, startDate: string | null | undefined, endDate: string | null | undefined): string {
  const now = new Date()
  const start = new Date(startDate ?? eventDate)
  const end = endDate ? new Date(endDate) : start

  if (now < start) {
    const diff = start.getTime() - now.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Starting today'
    if (days === 1) return 'Starts tomorrow'
    return `Starts in ${days} days`
  }

  if (now >= start && now <= end) {
    const diff = end.getTime() - now.getTime()
    const days = Math.ceil(diff / 86400000)
    if (days <= 1) return 'Ends today'
    return `Ongoing · ${days} days left`
  }

  const diff = now.getTime() - end.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Ended today'
  if (days === 1) return 'Ended yesterday'
  return `Ended ${days} days ago`
}

export function EventCountdown({ eventDate, startDate, endDate }: Props) {
  const [label, setLabel] = useState(getDiffLabel(eventDate, startDate, endDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setLabel(getDiffLabel(eventDate, startDate, endDate))
    }, 60000)
    return () => clearInterval(interval)
  }, [eventDate, startDate, endDate])

  const isPast = new Date(endDate ?? startDate ?? eventDate) < new Date()
  const isOngoing =
    !isPast && new Date(startDate ?? eventDate) <= new Date()

  const colorClass = isPast
    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    : isOngoing
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'

  return (
    <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${colorClass}`}>
      {label}
    </div>
  )
}
