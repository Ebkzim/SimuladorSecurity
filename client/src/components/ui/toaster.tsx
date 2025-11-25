import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react"

type ToastType = "default" | "destructive"

const getIconAndColor = (variant?: ToastType | null) => {
  switch (variant) {
    case "destructive":
      return {
        icon: XCircle,
        bgColor: "bg-gradient-to-r from-red-500 to-red-600",
        borderColor: "border-red-400",
        shadowColor: "shadow-red-500/30",
      }
    default:
      return {
        icon: CheckCircle,
        bgColor: "bg-gradient-to-r from-green-500 to-green-600",
        borderColor: "border-green-400",
        shadowColor: "shadow-green-500/30",
      }
  }
}

interface Toast {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastType | null
  open?: boolean
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast
  onClose: (id: string) => void
}) {
  const [isVisible, setIsVisible] = useState(true)
  const { icon: Icon, bgColor, borderColor, shadowColor } = getIconAndColor(
    toast.variant
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(toast.id), 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-lg border ${borderColor} ${bgColor} text-white shadow-lg ${shadowColor}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold leading-tight">
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p className="text-xs opacity-90 leading-tight mt-0.5">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose(toast.id), 300)
          }}
          className="flex-shrink-0 ml-2 rounded-md p-1 hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {isVisible && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 4, ease: "linear" }}
          className="absolute bottom-0 left-0 h-0.5 bg-white/40 origin-left"
          style={{ width: "100%" }}
        />
      )}
    </motion.div>
  )
}

export function Toaster() {
  const { toasts } = useToast()
  const [closedToasts, setClosedToasts] = useState<string[]>([])

  const handleClose = (id: string) => {
    setClosedToasts((prev) => [...prev, id])
  }

  const visibleToasts = toasts.filter((t) => !closedToasts.includes(t.id))

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={handleClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
