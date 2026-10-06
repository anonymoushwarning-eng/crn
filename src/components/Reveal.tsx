import { useEffect, useRef, useState, type ReactNode } from 'react'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A single observer shared by every revealed element keeps the cost flat even
// when the timeline has hundreds of cards.
type RevealCallback = () => void
const callbacks = new WeakMap<Element, RevealCallback>()
let sharedObserver: IntersectionObserver | null = null

function getObserver() {
  if (sharedObserver) return sharedObserver
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const callback = callbacks.get(entry.target)
        if (callback) callback()
        callbacks.delete(entry.target)
        sharedObserver?.unobserve(entry.target)
      }
    },
    // Trigger a little before the element is fully in view.
    { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
  )
  return sharedObserver
}

/**
 * Reveals an element once it scrolls into view: it rises from below with a
 * smooth fade. Attach the returned ref/classes to any element, or use the
 * `<Reveal>` wrapper. Skipped for reduced-motion users.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion() || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = getObserver()
    callbacks.set(el, () => setVisible(true))
    observer.observe(el)
    return () => {
      callbacks.delete(el)
      observer.unobserve(el)
    }
  }, [])

  return { ref, visible, className: `reveal ${visible ? 'is-visible' : ''}`.trim() }
}

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { ref, className: revealClass } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`${revealClass} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
