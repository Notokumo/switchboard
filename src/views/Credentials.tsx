import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, TextCell } from "../components/DataTable"
import { KeyModal } from "../components/KeyModal"
import {
  Badge,
  Button,
  EmptyState,
  Led,
  Modal,
  Panel,
  Spinner,
  useToast,
} from "../components/ui"
import {
  useActivateCredential,
  useCredentials,
  useDeleteCredential,
  useIntegrations,
} from "../lib/queries"
import type { CredentialInfo } from "../lib/types"
import { formatDate, maskSecret, methodLabel, plural } from "../lib/utils"

export function CredentialsView({ initialIntegration }: { initialIntegration?: string }) {
  const credentials = useCredentials()
  const integrations = useIntegrations()
  const activate = useActivateCredential()
  const remove = useDeleteCredential()
  const toast = useToast()

  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<CredentialInfo | null>(null)
  const [preset, setPreset] = useState<string | undefined>(initialIntegration)

  useEffect(() => {
    if (!initialIntegration) return
    setPreset(initialIntegration)
    setSearch(initialIntegration)
    setAddOpen(true)
  }, [initialIntegration])

  const integrationList = integrations.data ?? []
  const credentialList = credentials.data ?? []

  const nameOf = (integrationID: string) =>
    integrationList.find((item) => item.id === integrationID)?.name ?? integrationID

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return credentialList.filter((credential) => {
      if (!query) return true
      return (
        credential.integrationID.toLowerCase().includes(query) ||
        credential.label.toLowerCase().includes(query) ||
        nameOf(credential.integrationID).toLowerCase().includes(query)
      )
    })
  }, [credentialList, search, integrationList])

  const toggleReveal = (id: string) => {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns = useMemo<ColumnDef<CredentialInfo, any>[]>(
    () => [
      {
        id: "integration",
        header: "Integration",
        accessorFn: (row) => nameOf(row.integrationID),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Led tone={row.original.active ? "signal" : "muted"} />
            <TextCell primary={nameOf(row.original.integrationID)} secondary={row.original.integrationID} />
          </div>
        ),
      },
      {
        id: "label",
        header: "Label",
        size: 124,
        accessorKey: "label",
        cell: ({ getValue }) => (
          <span className="block truncate text-[12px] text-fog">{String(getValue())}</span>
        ),
      },
      {
        id: "type",
        header: "Method",
        size: 86,
        meta: { narrow: true },
        accessorFn: (row) => row.value.type,
        cell: ({ row }) => (
          <Badge tone="neutral">
            {row.original.value.type === "oauth"
              ? methodLabel("oauth")
              : row.original.value.type === "key"
                ? methodLabel("key")
                : row.original.value.type}
          </Badge>
        ),
      },
      {
        id: "secret",
        header: "Secret",
        size: 196,
        accessorFn: (row) => (row.value.type === "key" ? String(row.value.key ?? "") : ""),
        cell: ({ row }) => {
          const value = row.original.value

          if (value.type !== "key") {
            const expires =
              "expires" in value && typeof value.expires === "number" ? value.expires : undefined
            return (
              <span className="font-mono text-[10px] text-fog-dim">
                token {expires ? `· exp ${formatDate(expires)}` : ""}
              </span>
            )
          }

          const secret = String(value.key ?? "")
          const open = revealed.has(row.original.id)

          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate font-mono text-[11px] text-fog">
                {open ? secret : maskSecret(secret)}
              </span>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  toggleReveal(row.original.id)
                }}
                className="text-fog-dim transition-colors hover:text-amber"
                aria-label={open ? "Hide secret" : "Reveal secret"}
              >
                {open ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          )
        },
      },
      {
        id: "state",
        header: "State",
        size: 84,
        accessorKey: "active",
        cell: ({ getValue }) => (
          <Badge tone={getValue() ? "signal" : "muted"}>{getValue() ? "active" : "standby"}</Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 122,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            {!row.original.active ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (event) => {
                  event.stopPropagation()
                  try {
                    await activate.mutateAsync(row.original.id)
                    toast.push({ tone: "success", title: "Credential activated" })
                  } catch (error) {
                    toast.push({ tone: "error", title: "Activation failed", description: String(error) })
                  }
                }}
              >
                activate
              </Button>
            ) : null}
            <button
              onClick={(event) => {
                event.stopPropagation()
                setDeleteTarget(row.original)
              }}
              className="flex size-7 items-center justify-center border border-line text-fog-dim transition-colors hover:border-danger/50 hover:text-danger"
              aria-label="Remove credential"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ),
      },
    ],
    [activate, integrationList, revealed, toast],
  )

  const activeCount = credentialList.filter((credential) => credential.active).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-dim" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter integration or label"
              className="h-9 w-[280px] border border-line-bright bg-ink/60 pl-9 pr-3 text-[12px] text-bone placeholder:text-fog-dim/70 focus:border-amber/60 focus:outline-none"
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fog-dim">
            {activeCount} active / {credentialList.length} total
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setPreset(undefined)
            setAddOpen(true)
          }}
        >
          <Plus size={12} />
          Connect key
        </Button>
      </div>

      <Panel>
        {credentials.isLoading || integrations.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-fog-dim">
            <Spinner />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">loading credentials</span>
          </div>
        ) : credentials.isError ? (
          <EmptyState title="Could not read credentials" hint={String(credentials.error)} />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            empty={
              <EmptyState
                title="No credentials stored"
                hint="Connect an API key, or finish an OAuth flow from the terminal with /connect."
              />
            }
          />
        )}
      </Panel>

      <div className="flex items-start gap-2 border border-line bg-panel/40 px-3 py-2.5">
        <span className="mt-1 size-1.5 shrink-0 bg-amber" />
        <p className="text-[10.5px] leading-relaxed text-fog-dim">
          Secrets are returned by the local server in plain text and are masked until revealed. Switchboard
          keeps them only in memory; the source of truth is OpenCode's credential database. Removing an
          active credential can leave a provider without a usable model until another one is activated.
        </p>
      </div>

      <KeyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        integrations={integrationList}
        defaultIntegration={preset}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove credential"
        hint="This deletes the account from OpenCode's credential database."
        width="max-w-[440px]"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={remove.isPending}
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  await remove.mutateAsync(deleteTarget.id)
                  toast.push({ tone: "success", title: "Credential removed" })
                  setDeleteTarget(null)
                } catch (error) {
                  toast.push({ tone: "error", title: "Could not remove", description: String(error) })
                }
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="space-y-2 text-[12px] text-fog">
            <p>
              <span className="text-bone">{nameOf(deleteTarget.integrationID)}</span> ·{" "}
              {deleteTarget.label}
            </p>
            <p className="font-mono text-[11px] text-fog-dim">
              {deleteTarget.value.type === "key"
                ? maskSecret(String(deleteTarget.value.key ?? ""))
                : deleteTarget.value.type}
            </p>
            <p className="text-[11px] leading-relaxed text-fog-dim">
              {deleteTarget.active
                ? "This is the active credential for the integration."
                : "This credential is on standby."}
            </p>
          </div>
        ) : null}
      </Modal>

      <p className="font-mono text-[10px] tracking-[0.04em] text-fog-dim/70">
        {integrationList.length} integrations discovered · {plural(credentialList.length, "credential")}
      </p>
    </div>
  )
}
