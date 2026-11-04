import { ArrowUpRight, Boxes, Cpu, KeyRound, Waypoints } from "lucide-react"
import { Badge, EmptyState, KeyValue, Led, Panel, PanelHead, Spinner } from "../components/ui"
import {
  useConfigFile,
  useCredentials,
  useIntegrations,
  useModels,
  useProviders,
  useService,
} from "../lib/queries"
import { activationTone, compactNumber, maskSecret, plural } from "../lib/utils"

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  accent = "amber",
}: {
  icon: typeof Boxes
  label: string
  value: string
  detail: string
  accent?: "amber" | "signal"
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between">
        <span className="label">{label}</span>
        <Icon size={13} className={accent === "amber" ? "text-amber" : "text-signal"} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[30px] leading-none tracking-tight text-bone">{value}</span>
        <span className="h-1.5 w-1.5 bg-line-bright" />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-dim">{detail}</p>
    </Panel>
  )
}

export function OverviewView({
  onOpenProviders,
  onOpenCredentials,
}: {
  onOpenProviders: () => void
  onOpenCredentials: () => void
}) {
  const service = useService()
  const providers = useProviders()
  const models = useModels()
  const integrations = useIntegrations()
  const credentials = useCredentials()
  const config = useConfigFile()

  const loading =
    providers.isLoading || models.isLoading || credentials.isLoading || integrations.isLoading

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center gap-3 text-fog-dim">
        <Spinner />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]">reading inventory</span>
      </div>
    )
  }

  const providerList = providers.data ?? []
  const modelList = models.data ?? []
  const integrationList = integrations.data ?? []
  const credentialList = credentials.data ?? []

  const enabledProviders = providerList.filter((item) => item.activation === "enabled").length
  const autoProviders = providerList.filter((item) => item.activation === "auto").length
  const activeCredentials = credentialList.filter((item) => item.active).length
  const connectedIntegrations = integrationList.filter((item) => item.connections.length > 0).length

  const sortedProviders = [...providerList].sort((a, b) => a.name.localeCompare(b.name))
  const recentCredentials = [...credentialList].slice(-6).reverse()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          icon={Waypoints}
          label="Providers"
          value={compactNumber(providerList.length)}
          detail={`${enabledProviders} enabled · ${autoProviders} auto`}
        />
        <Stat
          icon={Cpu}
          label="Models"
          value={compactNumber(modelList.length)}
          detail={`${modelList.filter((item) => item.enabled).length} selectable`}
          accent="signal"
        />
        <Stat
          icon={KeyRound}
          label="Credentials"
          value={compactNumber(credentialList.length)}
          detail={`${activeCredentials} active`}
        />
        <Stat
          icon={Boxes}
          label="Integrations"
          value={compactNumber(integrationList.length)}
          detail={`${connectedIntegrations} connected`}
          accent="signal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Provider signal chain"
            hint="Configured providers and whether the credential path resolves"
            actions={
              <button
                onClick={onOpenProviders}
                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fog-dim transition-colors hover:text-amber"
              >
                inspect <ArrowUpRight size={11} />
              </button>
            }
          />
          <div className="divide-y divide-line/60">
            {sortedProviders.map((provider) => {
              const modelCount = modelList.filter((model) => model.providerID === provider.id).length
              const integration = integrationList.find((item) => item.id === provider.id)
              const connected = Boolean(integration && integration.connections.length > 0)

              return (
                <button
                  key={provider.id}
                  onClick={onOpenProviders}
                  className="row-hover flex w-full items-center gap-3 px-4 py-2.5 text-left"
                >
                  <Led tone={activationTone(provider.activation)} pulse={connected} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-bone">{provider.name}</div>
                    <div className="truncate font-mono text-[10px] text-fog-dim">{provider.id}</div>
                  </div>
                  <div className="hidden w-28 shrink-0 text-right font-mono text-[10px] text-fog-dim sm:block">
                    {modelCount} {plural(modelCount, "model")}
                  </div>
                  <div className="hidden w-24 shrink-0 items-center justify-end gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fog-dim md:flex">
                    <Led tone={connected ? "signal" : "muted"} />
                    {connected ? "keyed" : "no key"}
                  </div>
                  <Badge tone={activationTone(provider.activation)}>{provider.activation}</Badge>
                </button>
              )
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHead title="Service" hint="Registered OpenCode background process" />
            <div className="px-4 py-2">
              <KeyValue label="version">{service.data?.version ? `v${service.data.version}` : "—"}</KeyValue>
              <KeyValue label="endpoint">{service.data?.url ?? "—"}</KeyValue>
              <KeyValue label="pid">{service.data?.pid ?? "—"}</KeyValue>
              <KeyValue label="config">{config.data?.path ?? "—"}</KeyValue>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Credential ledger"
              hint={`${activeCredentials} active of ${credentialList.length}`}
              actions={
                <button
                  onClick={onOpenCredentials}
                  className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fog-dim transition-colors hover:text-amber"
                >
                  manage <ArrowUpRight size={11} />
                </button>
              }
            />
            {recentCredentials.length === 0 ? (
              <EmptyState title="No credentials stored" hint="Connect a key to activate a provider." />
            ) : (
              <div className="divide-y divide-line/60">
                {recentCredentials.map((credential) => (
                  <div key={credential.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Led tone={credential.active ? "signal" : "muted"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-bone">
                        {integrationList.find((item) => item.id === credential.integrationID)?.name ??
                          credential.integrationID}
                      </div>
                      <div className="truncate font-mono text-[10px] text-fog-dim">
                        {credential.value.type === "key"
                          ? maskSecret(String(credential.value.key ?? ""))
                          : credential.value.type}
                      </div>
                    </div>
                    <Badge tone={credential.active ? "signal" : "muted"}>
                      {credential.active ? "active" : "standby"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
