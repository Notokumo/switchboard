import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, TextCell } from "../components/DataTable"
import { AddProviderModal } from "../components/AddProviderModal"
import { AddModelModal } from "../components/AddModelModal"
import { KeyModal } from "../components/KeyModal"
import { Badge, Button, EmptyState, KeyValue, Led, Panel, Select, Sheet, Spinner } from "../components/ui"
import {
  useCredentials,
  useIntegrations,
  useModels,
  useProviders,
} from "../lib/queries"
import type { ProviderInfo } from "../lib/types"
import { activationTone, maskSecret, plural } from "../lib/utils"

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-52 overflow-auto border border-line bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-fog">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function ProvidersView({ onManageKeys }: { onManageKeys: (integration: string) => void }) {
  const providers = useProviders()
  const models = useModels()
  const integrations = useIntegrations()
  const credentials = useCredentials()

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<ProviderInfo | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [keyTarget, setKeyTarget] = useState<string | undefined>(undefined)
  const [modelTarget, setModelTarget] = useState<string | undefined>(undefined)

  const providerList = providers.data ?? []
  const modelList = models.data ?? []
  const integrationList = integrations.data ?? []
  const credentialList = credentials.data ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return providerList.filter((provider) => {
      if (filter !== "all" && provider.activation !== filter) return false
      if (!query) return true

      return (
        provider.id.toLowerCase().includes(query) ||
        provider.name.toLowerCase().includes(query) ||
        provider.package.toLowerCase().includes(query)
      )
    })
  }, [providerList, search, filter])

  const columns = useMemo<ColumnDef<ProviderInfo, any>[]>(
    () => [
      {
        id: "provider",
        header: "Provider",
        accessorFn: (row) => `${row.name} ${row.id}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Led
              tone={activationTone(row.original.activation)}
              pulse={row.original.activation === "enabled"}
            />
            <TextCell primary={row.original.name} secondary={row.original.id} />
          </div>
        ),
      },
      {
        id: "package",
        header: "Package",
        size: 200,
        accessorKey: "package",
        cell: ({ getValue }) => (
          <span
            title={String(getValue())}
            className="block truncate font-mono text-[10px] text-fog"
          >
            {String(getValue()).replace("@opencode/ai/providers/", "")}
          </span>
        ),
      },
      {
        id: "models",
        header: "Models",
        size: 70,
        accessorFn: (row) => modelList.filter((model) => model.providerID === row.id).length,
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-fog">{String(getValue())}</span>
        ),
      },
      {
        id: "auth",
        header: "Credentials",
        size: 118,
        accessorFn: (row) =>
          credentialList.filter((credential) => credential.integrationID === row.id).length,
        cell: ({ row, getValue }) => {
          const count = Number(getValue())
          const integration = integrationList.find((item) => item.id === row.original.id)

          return (
            <div className="flex items-center gap-2">
              <Led tone={count > 0 ? "signal" : "muted"} />
              <span className="font-mono text-[10px] text-fog-dim">
                {count > 0
                  ? `${count} ${plural(count, "key")}`
                  : integration
                    ? "no key"
                    : "not linked"}
              </span>
            </div>
          )
        },
      },
      {
        id: "activation",
        header: "State",
        size: 88,
        accessorKey: "activation",
        cell: ({ getValue }) => (
          <Badge tone={activationTone(String(getValue()))}>{String(getValue())}</Badge>
        ),
      },
    ],
    [credentialList, integrationList, modelList],
  )

  const selectedIntegration = selected
    ? integrationList.find((item) => item.id === selected.id || item.id === selected.integrationID)
    : undefined
  const selectedModels = selected
    ? modelList.filter((model) => model.providerID === selected.id)
    : []
  const selectedCredentials = selected
    ? credentialList.filter((credential) => credential.integrationID === selected.id)
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-dim" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search id, name or package"
              className="h-9 w-[280px] border border-line-bright bg-ink/60 pl-9 pr-3 text-[12px] text-bone placeholder:text-fog-dim/70 focus:border-amber/60 focus:outline-none"
            />
          </div>
          <Select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fog"
          >
            <option value="all">All states</option>
            <option value="enabled">Enabled</option>
            <option value="auto">Auto</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>

        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={12} />
          Add provider
        </Button>
      </div>

      <Panel>
        {providers.isLoading || models.isLoading || credentials.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-fog-dim">
            <Spinner />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">loading providers</span>
          </div>
        ) : providers.isError ? (
          <EmptyState title="Could not read providers" hint={String(providers.error)} />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(row) => setSelected(row)}
            initialSorting={[{ id: "provider", desc: false }]}
            empty={
              <EmptyState
                title="No providers match"
                hint="Clear the search or add a custom provider."
                action={
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus size={12} />
                    Add provider
                  </Button>
                }
              />
            }
          />
        )}
      </Panel>

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.04em] text-fog-dim/70">
        Activation is derived by the server. Declaring a provider does not create a credential — connect
        a key to switch it from auto to enabled.
      </p>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Provider"
        subtitle={selected ? `${selected.name} · ${selected.id}` : undefined}
        footer={
          selected ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onManageKeys(selected.id)
                  setSelected(null)
                }}
              >
                Open ledger
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setKeyTarget(selected.id)}
              >
                Connect key
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={activationTone(selected.activation)}>{selected.activation}</Badge>
              {selectedCredentials.length > 0 ? (
                <Badge tone="signal">{selectedCredentials.length} stored</Badge>
              ) : (
                <Badge tone="muted">no credentials</Badge>
              )}
            </div>

            <div>
              <KeyValue label="provider id">{selected.id}</KeyValue>
              <KeyValue label="package">{selected.package}</KeyValue>
              {selected.canonical ? (
                <KeyValue label="canonical">{selected.canonical}</KeyValue>
              ) : null}
              {selected.integrationID ? (
                <KeyValue label="integration">{selected.integrationID}</KeyValue>
              ) : null}
            </div>

            {selected.settings && Object.keys(selected.settings).length > 0 ? (
              <div>
                <div className="label mb-1.5">Settings</div>
                <JsonBlock value={selected.settings} />
              </div>
            ) : null}

            {selected.headers && Object.keys(selected.headers).length > 0 ? (
              <div>
                <div className="label mb-1.5">Headers</div>
                <JsonBlock value={selected.headers} />
              </div>
            ) : null}

            {selected.body && Object.keys(selected.body).length > 0 ? (
              <div>
                <div className="label mb-1.5">Body</div>
                <JsonBlock value={selected.body} />
              </div>
            ) : null}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="label">Models ({selectedModels.length})</div>
                <button
                  onClick={() => setModelTarget(selected.id)}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog-dim transition-colors hover:text-amber"
                >
                  + add model
                </button>
              </div>
              <div className="border border-line">
                {selectedModels.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-fog-dim">
                    No models exposed for this provider.
                  </p>
                ) : (
                  selectedModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between gap-3 border-b border-line/60 px-3 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[12px] text-bone">{model.name}</div>
                        <div className="truncate font-mono text-[10px] text-fog-dim">{model.id}</div>
                      </div>
                      <Badge tone={model.enabled ? "signal" : "muted"}>
                        {model.enabled ? "on" : "off"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="label mb-1.5">Credentials</div>
              {selectedCredentials.length === 0 ? (
                <p className="border border-line px-3 py-3 text-[11px] text-fog-dim">
                  Nothing stored for this integration yet.
                </p>
              ) : (
                <div className="border border-line">
                  {selectedCredentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-center justify-between gap-3 border-b border-line/60 px-3 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] text-bone">{credential.label}</div>
                        <div className="truncate font-mono text-[10px] text-fog-dim">
                          {credential.value.type === "key"
                            ? maskSecret(String(credential.value.key ?? ""))
                            : credential.value.type}
                        </div>
                      </div>
                      <Led tone={credential.active ? "signal" : "muted"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Sheet>

      <AddProviderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(providerID) => setKeyTarget(providerID)}
      />

      <KeyModal
        open={Boolean(keyTarget)}
        onClose={() => setKeyTarget(undefined)}
        integrations={integrationList}
        defaultIntegration={keyTarget}
      />

      <AddModelModal
        open={Boolean(modelTarget)}
        onClose={() => setModelTarget(undefined)}
        providerID={modelTarget ?? ""}
      />
    </div>
  )
}
