import { useEffect, useRef, type ReactNode } from "react"
import { Braces, Cpu, KeyRound, LayoutGrid, RefreshCw, Server, Waypoints } from "lucide-react"
import { cn } from "../lib/utils"
import { Button, Led } from "./ui"
import type { ServiceInfo } from "../lib/types"

export type ViewKey = "overview" | "providers" | "models" | "credentials" | "config"

const NAV: { key: ViewKey; index: string; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", index: "01", label: "Overview", icon: LayoutGrid },
  { key: "providers", index: "02", label: "Providers", icon: Waypoints },
  { key: "models", index: "03", label: "Models", icon: Cpu },
  { key: "credentials", index: "04", label: "Credentials", icon: KeyRound },
  { key: "config", index: "05", label: "Config", icon: Braces },
]

const COPY: Record<ViewKey, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Signal chain, service health and inventory" },
  providers: { title: "Providers", subtitle: "Routing endpoints, packages and activation" },
  models: { title: "Models", subtitle: "Context, cost and capability inventory" },
  credentials: { title: "Credentials", subtitle: "Stored accounts and active keys" },
  config: { title: "Config", subtitle: "Direct edit of opencode.jsonc with backups" },
}

export function Shell({
  current,
  onNavigate,
  service,
  onReload,
  reloading,
  children,
}: {
  current: ViewKey
  onNavigate: (view: ViewKey) => void
  service: ServiceInfo | undefined
  onReload: () => void
  reloading: boolean
  children: ReactNode
}) {
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [current])

  return (
    <div className="relative z-10 flex h-full">
      <aside className="flex w-[244px] shrink-0 flex-col border-r border-line bg-panel/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-line px-5 py-[18px]">
          <div className="grid size-9 shrink-0 grid-cols-3 gap-[3px] border border-line-bright bg-ink p-[5px]">
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
            <span className="bg-amber" />
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
            <span className="bg-fog-dim/60" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-[0.16em] text-bone">SWITCHBOARD</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fog-dim">
              opencode control
            </div>
          </div>
        </div>

        <nav className="flex flex-col py-3">
          {NAV.map((item) => {
            const active = current === item.key
            const Icon = item.icon

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "group relative flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                  active ? "text-bone" : "text-fog hover:text-bone",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 transition-all",
                    active ? "bg-amber" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-[0.1em]",
                    active ? "text-amber" : "text-fog-dim",
                  )}
                >
                  {item.index}
                </span>
                <Icon size={14} className={active ? "text-amber" : "text-fog-dim"} />
                <span className="text-[12.5px] tracking-wide">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-line p-4">
          <div className="border border-line bg-ink/50 p-3">
            <div className="flex items-center gap-2">
              <Led tone={service ? "signal" : "danger"} pulse={Boolean(service)} />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog">
                {service ? "service online" : "service offline"}
              </span>
            </div>
            <div className="mt-2.5 space-y-1 font-mono text-[10px] text-fog-dim">
              <div className="flex items-center justify-between gap-2">
                <span>version</span>
                <span className="text-fog">{service?.version ? `v${service.version}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>pid</span>
                <span className="text-fog">{service?.pid || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Server size={9} />
                <span className="truncate" title={service?.url}>
                  {service?.url ?? "unreachable"}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 font-mono text-[9px] leading-relaxed tracking-[0.06em] text-fog-dim/70">
            local bridge · host-only
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-6 border-b border-line bg-ink/40 px-7 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[10px] tracking-[0.2em] text-amber">
                {NAV.find((item) => item.key === current)?.index}
              </span>
              <h1 className="truncate text-[20px] font-semibold tracking-tight text-bone">
                {COPY[current].title}
              </h1>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fog-dim">{COPY[current].subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 border border-line bg-panel/60 px-2.5 py-1.5 lg:flex">
              <Led tone={service ? "signal" : "danger"} pulse={Boolean(service)} />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog-dim">
                {service ? "connected" : "no service"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onReload} disabled={reloading}>
              <RefreshCw size={12} className={reloading ? "animate-spin" : ""} />
              Reload config
            </Button>
          </div>
        </header>

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1240px] px-7 py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
