import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, TextCell } from "../components/DataTable"
import { AddModelModal } from "../components/AddModelModal"
import { Badge, Button, EmptyState, KeyValue, Led, Panel, Select, Sheet, Spinner } from "../components/ui"
import { useModels, useProviders } from "../lib/queries"
import type { ModelInfo } from "../lib/types"
import { compactNumber, formatDate, usd } from "../lib/utils"

const FALLBACK_TYPES = ["chat"]

export function ModelsView() {
  const models = useModels()
  const providers = useProviders()

  const [search, setSearch] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [enabledOnly, setEnabledOnly] = useState(false)
  const [selected, setSelected] = useState<ModelInfo | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const modelList = models.data ?? []
  const providerList = providers.data ?? []

  const providerName = (id: string) => providerList.find((item) => item.id === id)?.name ?? id

  const typeOptions = useMemo(() => {
    const seen = new Set<string>(FALLBACK_TYPES)

    for (const model of modelList) seen.add(model.type || "unset")

    return ["all", ...Array.from(seen).sort()]
  }, [modelList])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return modelList.filter((model) => {
      if (providerFilter !== "all" && model.providerID !== providerFilter) return false
      if (typeFilter !== "all" && (model.type || "unset") !== typeFilter) return false
      if (enabledOnly && !model.enabled) return false
      if (!query) return true

      return (
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.providerID.toLowerCase().includes(query)
      )
    })
  }, [modelList, search, providerFilter, typeFilter, enabledOnly])

  const columns = useMemo<ColumnDef<ModelInfo, any>[]>(
    () => [
      {
        id: "model",
        header: "Model",
        accessorFn: (row) => `${row.name} ${row.id}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Led tone={row.original.enabled ? "signal" : "muted"} />
            <TextCell primary={row.original.name} secondary={row.original.id} />
          </div>
        ),
      },
      {
        id: "provider",
        header: "Provider",
        size: 160,
        accessorFn: (row) => providerName(row.providerID),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-[12px] text-fog">{providerName(row.original.providerID)}</div>
            <div className="truncate font-mono text-[10px] text-fog-dim">{row.original.providerID}</div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        size: 74,
        meta: { narrow: true },
        accessorFn: (row) => row.type ?? "unset",
        cell: ({ getValue }) =>
          getValue() === "unset" ? (
            <span className="font-mono text-[11px] text-fog-dim">—</span>
          ) : (
            <Badge tone="neutral">{String(getValue())}</Badge>
          ),
      },
      {
        id: "context",
        header: "Context",
        size: 74,
        accessorFn: (row) => row.limit.context,
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-fog">{compactNumber(Number(getValue()))}</span>
        ),
      },
      {
        id: "output",
        header: "Out",
        size: 62,
        meta: { narrow: true },
        accessorFn: (row) => row.limit.output,
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-fog">{compactNumber(Number(getValue()))}</span>
        ),
      },
      {
        id: "cost",
        header: "$/Mtok",
        size: 118,
        accessorFn: (row) => row.cost[0]?.input ?? 0,
        cell: ({ row }) => {
          const cost = row.original.cost[0]
          return (
            <span className="block truncate font-mono text-[10px] text-fog-dim">
              <span className="text-fog">{usd(cost?.input ?? 0)}</span> / {usd(cost?.output ?? 0)}
            </span>
          )
        },
      },
      {
        id: "tools",
        header: "Tools",
        size: 64,
        meta: { narrow: true },
        accessorFn: (row) => row.capabilities.tools,
        cell: ({ getValue }) =>
          getValue() ? <Badge tone="signal">tool</Badge> : <Badge tone="muted">text</Badge>,
      },
      {
        id: "status",
        header: "Status",
        size: 84,
        accessorKey: "status",
        cell: ({ getValue }) => {
          const value = String(getValue())
          return (
            <Badge tone={value === "active" ? "neutral" : value === "deprecated" ? "danger" : "amber"}>
              {value}
            </Badge>
          )
        },
      },
    ],
    [providerList],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-dim" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search model or provider"
            className="h-9 w-[280px] border border-line-bright bg-ink/60 pl-9 pr-3 text-[12px] text-bone placeholder:text-fog-dim/70 focus:border-amber/60 focus:outline-none"
          />
        </div>

        <Select
          value={providerFilter}
          onChange={(event) => setProviderFilter(event.target.value)}
          className="w-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fog"
        >
          <option value="all">All providers</option>
          {providerList.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </Select>

        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="w-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fog"
        >
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All types" : type === "unset" ? "type unset" : type}
            </option>
          ))}
        </Select>

        <button
          onClick={() => setEnabledOnly((value) => !value)}
          className={`h-9 border px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
            enabledOnly
              ? "border-signal/40 bg-signal/5 text-signal"
              : "border-line-bright bg-ink/60 text-fog-dim hover:text-bone"
          }`}
        >
          selectable only
        </button>

        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fog-dim">
          {filtered.length} of {modelList.length}
        </span>

        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={12} />
          Add model
        </Button>
      </div>

      <Panel>
        {models.isLoading || providers.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-fog-dim">
            <Spinner />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">loading models</span>
          </div>
        ) : models.isError ? (
          <EmptyState title="Could not read models" hint={String(models.error)} />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(row) => setSelected(row)}
            initialSorting={[{ id: "provider", desc: false }]}
            empty={<EmptyState title="No models match" hint="Adjust the filters or search query." />}
          />
        )}
      </Panel>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Model"
        subtitle={selected ? `${selected.name} · ${selected.providerID}/${selected.id}` : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selected.enabled ? "signal" : "muted"}>
                {selected.enabled ? "selectable" : "disabled"}
              </Badge>
              <Badge tone="neutral">{selected.type}</Badge>
              <Badge tone={selected.status === "active" ? "neutral" : "amber"}>
                {selected.status}
              </Badge>
              {selected.capabilities.tools ? <Badge tone="signal">tools</Badge> : null}
              {selected.capabilities.reasoning ? <Badge tone="amber">reasoning</Badge> : null}
            </div>

            <div>
              <KeyValue label="model id">{selected.id}</KeyValue>
              <KeyValue label="upstream id">{selected.modelID}</KeyValue>
              <KeyValue label="provider">{selected.providerID}</KeyValue>
              <KeyValue label="family">{selected.family ?? "—"}</KeyValue>
              <KeyValue label="released">{formatDate(selected.time.released)}</KeyValue>
              {selected.package ? <KeyValue label="package">{selected.package}</KeyValue> : null}
            </div>

            <div>
              <div className="label mb-2">Limits</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "context", value: selected.limit.context },
                  { label: "input", value: selected.limit.input ?? selected.limit.context },
                  { label: "output", value: selected.limit.output },
                ].map((item) => (
                  <div key={item.label} className="border border-line bg-ink/40 px-3 py-2">
                    <div className="label">{item.label}</div>
                    <div className="mt-1 font-mono text-[15px] text-bone">
                      {compactNumber(item.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="label mb-2">Cost per million tokens</div>
              <div className="border border-line">
                {selected.cost.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-fog-dim">No pricing metadata.</p>
                ) : (
                  selected.cost.map((tier, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 border-b border-line/60 px-3 py-2 last:border-0"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fog-dim">
                        tier {index + 1}
                      </span>
                      <span className="font-mono text-[11px] text-fog">
                        in {usd(tier.input)} · out {usd(tier.output)} · cache{" "}
                        {usd(tier.cache?.read ?? 0)}/{usd(tier.cache?.write ?? 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="label mb-2">Capabilities</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.capabilities.input.map((item) => (
                  <Badge key={`in-${item}`} tone="neutral">
                    in · {item}
                  </Badge>
                ))}
                {selected.capabilities.output.map((item) => (
                  <Badge key={`out-${item}`} tone="neutral">
                    out · {item}
                  </Badge>
                ))}
                {selected.capabilities.temperature ? <Badge tone="muted">temperature</Badge> : null}
              </div>
            </div>

            <div>
              <div className="label mb-2">Variants ({selected.variants.length})</div>
              {selected.variants.length === 0 ? (
                <p className="border border-line px-3 py-3 text-[11px] text-fog-dim">
                  No variants declared. The model runs with its default settings.
                </p>
              ) : (
                <div className="border border-line">
                  {selected.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="border-b border-line/60 px-3 py-2 last:border-0"
                    >
                      <div className="font-mono text-[11px] text-bone">{variant.id}</div>
                      {variant.settings ? (
                        <pre className="mt-1 overflow-auto font-mono text-[10px] leading-relaxed text-fog-dim">
                          {JSON.stringify(variant.settings, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected.settings && Object.keys(selected.settings).length > 0 ? (
              <div>
                <div className="label mb-2">Settings</div>
                <pre className="max-h-52 overflow-auto border border-line bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-fog">
                  {JSON.stringify(selected.settings, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <AddModelModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        providerID={providerFilter !== "all" ? providerFilter : undefined}
        providers={providerList.map((provider) => ({ id: provider.id, name: provider.name }))}
      />
    </div>
  )
}
