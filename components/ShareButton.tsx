'use client'

import {useState, useRef, useEffect} from 'react'
import {Share2, Check} from 'lucide-react'
import QRCode from 'react-qr-code'

export function ShareButton({path}: {path: string}) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [origin, setOrigin] = useState('')
  const [panelStyle, setPanelStyle] = useState<{top: number; left: number} | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!showQR) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowQR(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQR])

  function handleClick() {
    const url = window.location.origin + path
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    if (!showQR && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPanelStyle({top: rect.bottom + 4, left: rect.left})
    }
    setShowQR((prev) => !prev)
  }

  const fullUrl = origin + path

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        title="Share"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        <span className={`text-xs ${copied ? 'text-green-500' : ''}`}>
          {copied ? 'URL copied' : 'Share'}
        </span>
      </button>

      {showQR && panelStyle && origin && (
        <div
          ref={panelRef}
          style={{position: 'fixed', top: panelStyle.top, left: panelStyle.left, zIndex: 50}}
          className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
        >
          <QRCode value={fullUrl} size={120} />
          <p className="mt-2 font-mono text-[10px] text-gray-400 w-[120px] break-all leading-tight">
            {fullUrl}
          </p>
          <button
            onClick={() => setShowQR(false)}
            className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            close
          </button>
        </div>
      )}
    </>
  )
}
