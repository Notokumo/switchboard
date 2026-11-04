import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { X } from "lucide-react"
import { cn } from "../lib/utils"

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md"
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-35",
        size === "sm" ? "h-7 px-2.5" : "h-9 px-4",
        variant === "primary" && "bg-amber text-ink hover:bg-[#ffb65a] active:translate-y-px",
        variant === "outline" &&
          "border border-line-bright bg-panel-2 text-bone hover:border-amber/50 hover:text-amber",
        variant === "ghost" && "text-fog hover:bg-white/5 hover:text-bone",
        variant === "danger" && "border border-danger/40 bg-danger/5 text-danger hover:bg-danger/15",
        className,
      )}
    />
  )
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: "neutral" | "signal" | "amber" | "danger" | "muted"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
        tone === "neutral" && "border-line-bright text-fog",
        tone === "signal" && "border-signal/30 bg-signal/5 text-signal",
        tone === "amber" && "border-amber/30 bg-amber/5 text-amber",
        tone === "danger" && "border-danger/35 bg-danger/5 text-danger",
        tone === "muted" && "border-line text-fog-dim",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Led({
  tone = "signal",
  pulse = false,
  className,
}: {
  tone?: "signal" | "amber" | "danger" | "muted"
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        tone === "signal" && "bg-signal text-signal shadow-[0_0_8px_rgba(99,230,162,0.55)]",
        tone === "amber" && "bg-amber text-amber shadow-[0_0_8px_rgba(242,163,60,0.5)]",
        tone === "danger" && "bg-danger text-danger shadow-[0_0_8px_rgba(255,107,94,0.5)]",
        tone === "muted" && "bg-fog-dim",
        pulse && "animate-[led-pulse_2.2s_ease-in-out_infinite]",
        className,
      )}
    />
  )
}

export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode
  className?: string
  as?: "section" | "div" | "article"
}) {
  return <Tag className={cn("panel", className)}>{children}</Tag>
}

export function PanelHead({
  title,
  hint,
  actions,
  className,
}: {
  title: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="label">{title}</div>
        {hint ? <div className="mt-1 truncate text-[11px] text-fog-dim">{hint}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] leading-relaxed text-fog-dim">{hint}</span> : null}
    </label>
  )
}

const controlClass =
  "w-full border border-line-bright bg-ink/60 px-3 text-[13px] text-bone placeholder:text-fog-dim/70 transition-colors focus:border-amber/60 focus:outline-none"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, "h-9", className)} />
}

export function Select({ className, style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'><path fill='%238b978f' d='M0 0h9L4.5 6z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        ...style,
      }}
      className={cn(controlClass, "h-9 appearance-none pr-8", className)}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(controlClass, "min-h-24 resize-y py-2 font-mono text-[12px] leading-relaxed", className)}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-left"
    >
      <span
        className={cn(
          "relative h-4 w-8 border transition-colors",
          checked ? "border-signal/50 bg-signal/20" : "border-line-bright bg-ink",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.5 transition-all",
            checked ? "left-[18px] bg-signal" : "left-0.5 bg-fog-dim",
          )}
        />
      </span>
      <span className="text-[12px] text-fog">{label}</span>
    </button>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-[540px]",
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
      />
      <aside
        className={cn(
          "animate-sheet-in relative flex h-full w-full flex-col border-l border-line-bright bg-panel",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="label">{title}</div>
            {subtitle ? (
              <div className="mt-1.5 truncate font-mono text-[12px] text-fog">{subtitle}</div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-line-bright text-fog transition-colors hover:border-amber/50 hover:text-amber"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  hint,
  children,
  footer,
  width = "max-w-[560px]",
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  hint?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-fade-up relative flex max-h-[86vh] w-full flex-col border border-line-bright bg-panel shadow-[0_30px_120px_rgba(0,0,0,0.6)]",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-bone">{title}</h2>
            {hint ? <p className="mt-1 text-[11px] leading-relaxed text-fog-dim">{hint}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-line-bright text-fog transition-colors hover:border-amber/50 hover:text-amber"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export function KeyValue({
  label,
  children,
  mono = true,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line/70 py-2 last:border-0">
      <span className="label pt-0.5">{label}</span>
      <span className={cn("min-w-0 break-all text-right text-[12px]", mono && "font-mono")}>
        {children}
      </span>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border border-fog-dim border-t-amber",
        className,
      )}
    />
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 flex size-9 items-center justify-center border border-line-bright text-fog-dim">
        <span className="size-2 bg-fog-dim" />
      </span>
      <p className="text-[13px] text-bone">{title}</p>
      {hint ? <p className="max-w-sm text-[11px] leading-relaxed text-fog-dim">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

/* ---------------------------------- toasts --------------------------------- */

type ToastTone = "success" | "error" | "info"
interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id">) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { ...toast, id }])
      const timer = window.setTimeout(() => remove(id), 5000)
      timers.current.set(id, timer)
    },
    [remove],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((timer) => window.clearTimeout(timer))
      map.clear()
    }
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[340px] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "animate-toast-in pointer-events-auto border bg-panel-2 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
              toast.tone === "success" && "border-signal/30",
              toast.tone === "error" && "border-danger/40",
              toast.tone === "info" && "border-line-bright",
            )}
          >
            <div className="flex items-start gap-2.5">
              <Led
                tone={toast.tone === "success" ? "signal" : toast.tone === "error" ? "danger" : "amber"}
                className="mt-1.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-bone">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 break-words text-[11px] leading-relaxed text-fog-dim">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => remove(toast.id)}
                className="text-fog-dim transition-colors hover:text-bone"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}
