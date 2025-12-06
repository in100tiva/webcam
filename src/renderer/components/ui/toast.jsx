import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const ToastContext = React.createContext({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const addToast = React.useCallback((message, variant = "default") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function Toast({ toast, onClose }) {
  const variants = {
    default: "bg-card border-border",
    success: "bg-green-600 border-green-700 text-white",
    error: "bg-destructive border-destructive text-destructive-foreground",
    warning: "bg-amber-500 border-amber-600 text-white",
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300",
        variants[toast.variant] || variants.default
      )}
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
