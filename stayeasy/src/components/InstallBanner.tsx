import { AnimatePresence, motion } from 'framer-motion'
import { site } from '../config/site'
import { Download, Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const KEY = 'stayeasy.install.dismissed'

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(KEY))
    return t > 0 && Date.now() - t < 7 * 86_400_000
  } catch {
    return false
  }
}

/** Offers "Install app" on Android/desktop Chrome, and Add-to-Home-Screen steps on iPhone. */
export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
    if (standalone || dismissedRecently()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    let t: number | undefined
    if (isIos) {
      setIos(true)
      t = window.setTimeout(() => setShow(true), 4000)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (t) clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          aria-label={`Install the ${site.name} app`}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed inset-x-3 z-50 mx-auto max-w-md rounded-2xl bg-navy-900 p-4 text-white shadow-float md:right-6 md:bottom-6 md:left-auto"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-start gap-3">
            <img src="/brand/emblem.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
            <div className="flex-1">
              <strong className="block">Get the {site.name} app</strong>
              {ios ? (
                <span className="text-sm text-[#D3DCEE]">
                  Tap <Share className="inline h-4 w-4 align-[-2px]" aria-label="Share" /> then “Add to Home Screen”.
                </span>
              ) : (
                <span className="text-sm text-[#D3DCEE]">Faster booking, app-only deals, works offline.</span>
              )}
            </div>
            <button type="button" aria-label="Dismiss" className="-mt-1 -mr-1 flex h-11 w-11 items-center justify-center rounded-lg text-[#D3DCEE]" onClick={dismiss}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {deferred && (
            <button
              type="button"
              className="btn mt-3 w-full bg-ember-600 text-white hover:bg-ember-700"
              onClick={async () => {
                await deferred.prompt()
                await deferred.userChoice
                setDeferred(null)
                setShow(false)
              }}
            >
              <Download className="h-5 w-5" aria-hidden="true" /> Install app
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
