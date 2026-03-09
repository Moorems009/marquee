'use client'

import { useEffect, useRef, useState } from 'react'

export type BarcodeResult = {
  title: string
  year: number | null
  poster_url: string | null
  director: string | null
  mpaa_rating: string | null
  genre: string | null
}

type Props = {
  onScan: (result: BarcodeResult) => void
  onClose: () => void
}

type ScanState = 'scanning' | 'found' | 'looking_up' | 'not_found' | 'error' | 'no_camera' | 'permission_denied'

export default function BarcodeScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [statusText, setStatusText] = useState('Point your camera at the barcode on the disc case.')
  const scannedRef = useRef(false)

  useEffect(() => {
    let stopped = false

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')

        // Restrict to UPC/EAN formats only — movie discs never use QR, Aztec, etc.
        // Scanning fewer formats significantly improves detection speed on mobile.
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
        ])
        // Sample more aggressively per frame — trades a little CPU for faster detection
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints)

        // Use decodeFromConstraints so the browser prompts for camera permission
        // before we try to enumerate devices. facingMode: 'environment' selects
        // the rear camera on mobile without needing a device list.
        // Higher resolution gives ZXing more pixels per barcode bar to work with.
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
          videoRef.current!,
          async (result, err) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            if (stopped || scannedRef.current) return
            if (err) return // ZXing throws on every frame with no barcode — normal
            if (!result) return

            const upc = result.getText()
            scannedRef.current = true
            setScanState('looking_up')
            setStatusText(`Found barcode: ${upc} — looking up…`)

            try {
              const res = await fetch(`/api/barcode?upc=${encodeURIComponent(upc)}`)
              if (!res.ok) {
                setScanState('not_found')
                setStatusText('Disc not found. Try searching by title instead.')
                return
              }
              const data = await res.json()
              if (data.error) {
                setScanState('not_found')
                setStatusText('Disc not found. Try searching by title instead.')
                return
              }
              setScanState('found')
              onScan(data as BarcodeResult)
            } catch {
              setScanState('error')
              setStatusText('Lookup failed. Try searching by title instead.')
            }
          }
        )
        if (!stopped) controlsRef.current = controls
        else controls.stop()
      } catch (e) {
        if (!stopped) {
          const name = (e instanceof Error) ? e.name : ''
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setScanState('permission_denied')
            setStatusText('Camera access was denied. Please allow camera access and try again.')
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            setScanState('no_camera')
            setStatusText('No camera found on this device.')
          } else {
            console.error('Scanner error', e)
            setScanState('no_camera')
            setStatusText(`Could not start camera${e instanceof Error ? `: ${e.message}` : '.'}`)
          }
        }
      }
    }

    startScanner()

    return () => {
      stopped = true
      controlsRef.current?.stop()
    }
  }, [onScan])

  const isTerminal = scanState === 'found' || scanState === 'not_found' || scanState === 'error' || scanState === 'no_camera' || scanState === 'permission_denied'

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(44,62,107,0.7)] flex items-center justify-center z-1000"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border border-powder-blue rounded p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[1rem] text-dusty-rose uppercase tracking-widest">Scan Barcode</h2>
          <button
            onClick={onClose}
            className="text-warm-gray bg-transparent border-none cursor-pointer font-serif text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Camera viewfinder */}
        {(scanState === 'scanning' || scanState === 'looking_up') && (
          <div className="relative w-full rounded overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {/* Targeting overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-powder-blue rounded"
                style={{ width: '70%', height: '30%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              />
            </div>
            {scanState === 'looking_up' && (
              <div className="absolute inset-0 bg-[rgba(44,62,107,0.6)] flex items-center justify-center">
                <span className="text-white text-sm font-serif">Looking up…</span>
              </div>
            )}
          </div>
        )}

        <p className="text-warm-gray text-sm m-0 text-center">{statusText}</p>

        {isTerminal && scanState !== 'found' && (
          <button
            onClick={onClose}
            className="bg-powder-blue text-navy border-none px-4 py-2 cursor-pointer font-serif rounded-sm text-sm font-bold"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
