import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsUp } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Floating "Back to top" pill that appears once the page is scrolled. */
export default function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > 500)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed right-4 bottom-24 z-30 flex items-center gap-2 rounded-full bg-white px-5 py-3.5 text-[15px] font-black text-ember-600 shadow-float ring-1 ring-line md:right-8 md:bottom-8 print:hidden"
        >
          <ChevronsUp className="h-5 w-5" aria-hidden="true" /> Back To Top
        </motion.button>
      )}
    </AnimatePresence>
  )
}
