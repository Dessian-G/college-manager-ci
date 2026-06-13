import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) setTimeout(() => remove(id), duration)
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((msg, dur) => push(msg, 'success', dur), [push])
  const error   = useCallback((msg, dur) => push(msg, 'error', dur || 5000), [push])
  const warning = useCallback((msg, dur) => push(msg, 'warning', dur), [push])

  return (
    <ToastContext.Provider value={{ success, error, warning, push }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  const icons = {
    success: <CheckCircle size={18} className="text-green-500 shrink-0" />,
    error:   <XCircle size={18} className="text-red-500 shrink-0" />,
    warning: <AlertCircle size={18} className="text-yellow-500 shrink-0" />,
    info:    <AlertCircle size={18} className="text-blue-500 shrink-0" />,
  }
  const borders = {
    success: 'border-green-300', error: 'border-red-300',
    warning: 'border-yellow-300', info: 'border-blue-300',
  }

  return (
    <div className={`flex items-start gap-3 bg-white rounded-lg shadow-lg border p-3 ${borders[toast.type] || ''} animate-slide-in`}>
      {icons[toast.type]}
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
