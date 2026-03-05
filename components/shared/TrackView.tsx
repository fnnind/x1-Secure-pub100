'use client'

import { useEffect } from 'react'

type EntityType = 'subxeuron' | 'publication' | 'event' | 'post'

export function TrackView({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId }),
    }).catch(() => {/* fire-and-forget */})
  }, [entityType, entityId])

  return null
}
