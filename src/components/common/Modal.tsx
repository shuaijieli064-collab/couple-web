import { type ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sakura-900/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-xl shadow-sakura-100/50 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[fade-in-up_0.2s_ease-out]">
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-sakura-100/50">
            <h2 className="text-lg font-semibold text-cloud-800">{title}</h2>
            <button onClick={onClose} className="text-cloud-400 hover:text-sakura-500 text-xl leading-none transition-colors">&times;</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
