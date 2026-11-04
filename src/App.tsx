import { useCallback, useState } from "react"
import { Shell, type ViewKey } from "./components/Shell"
import { ToastProvider, useToast, Button } from "./components/ui"
import { hasHost } from "./lib/host"
import { api } from "./lib/api"
import { useRefreshAll, useService } from "./lib/queries"
import { OverviewView } from "./views/Overview"
import { ProvidersView } from "./views/Providers"
import { ModelsView } from "./views/Models"
import { CredentialsView } from "./views/Credentials"
import { ConfigView } from "./views/Config"

interface RouteState {
  view: ViewKey
  integration?: string
}

function Workspace() {
  const [route, setRoute] = useState<RouteState>({ view: "overview" })
  const [reloading, setReloading] = useState(false)
  const service = useService()
  const refreshAll = useRefreshAll()
  const toast = useToast()

  const navigate = useCallback((view: ViewKey, integration?: string) => {
    setRoute({ view, integration })
  }, [])

  const reload = useCallback(async () => {
    setReloading(true)
    try {
      await api.reload()
      refreshAll()
      toast.push({ tone: "success", title: "Configuration reloaded", description: "The server re-read the config and tool catalog." })
    } catch (error) {
      toast.push({ tone: "error", title: "Reload failed", description: String(error) })
    } finally {
      window.setTimeout(() => setReloading(false), 350)
    }
  }, [refreshAll, toast])

  return (
    <Shell
      current={route.view}
      onNavigate={(view) => navigate(view)}
      service={service.data}
      onReload={reload}
      reloading={reloading}
    >
      {route.view === "overview" ? (
        <OverviewView
          onOpenProviders={() => navigate("providers")}
          onOpenCredentials={() => navigate("credentials")}
        />
      ) : null}
      {route.view === "providers" ? (
        <ProvidersView onManageKeys={(integration) => navigate("credentials", integration)} />
      ) : null}
      {route.view === "models" ? <ModelsView /> : null}
      {route.view === "credentials" ? (
        <CredentialsView initialIntegration={route.integration} />
      ) : null}
      {route.view === "config" ? <ConfigView /> : null}
    </Shell>
  )
}

function HostMissing() {
  return (
    <div className="relative z-10 flex h-full items-center justify-center p-8">
      <div className="panel max-w-[560px] p-8">
        <div className="label">switchboard</div>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-bone">
          Desktop shell required
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-fog">
          You are looking at the Vite preview. Switchboard talks to the OpenCode service through a
          local Tauri bridge, so it needs the desktop window.
        </p>
        <pre className="mt-4 border border-line bg-ink px-4 py-3 font-mono text-[12px] text-signal">
          npm run tauri dev
        </pre>
        <p className="mt-4 text-[11px] leading-relaxed text-fog-dim">
          The bridge reads the service registration from{" "}
          <code className="font-mono text-fog">~/.local/state/opencode/service.json</code> and never
          exposes credentials to the web layer.
        </p>
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      {hasHost() ? <Workspace /> : <HostMissing />}
    </ToastProvider>
  )
}
