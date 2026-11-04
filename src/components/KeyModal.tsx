import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { Button, Field, Input, Modal, Select, Toggle, useToast } from "./ui"
import { useConnectKey, useProviders } from "../lib/queries"
import type { IntegrationInfo } from "../lib/types"

export function KeyModal({
  open,
  onClose,
  integrations,
  defaultIntegration,
  onConnected,
}: {
  open: boolean
  onClose: () => void
  integrations: IntegrationInfo[]
  defaultIntegration?: string
  onConnected?: (integrationID: string) => void
}) {
  const toast = useToast()
  const connect = useConnectKey()
  const providers = useProviders()
  const [integrationID, setIntegrationID] = useState(defaultIntegration ?? "")
  const [label, setLabel] = useState("API key")
  const [key, setKey] = useState("")
  const [activate, setActivate] = useState(true)
  const [reveal, setReveal] = useState(false)

  const options = useMemo(
    () => [...integrations].sort((a, b) => a.name.localeCompare(b.name)),
    [integrations],
  )

  const configuredIDs = useMemo(
    () => new Set((providers.data ?? []).map((provider) => provider.id)),
    [providers.data],
  )

  const configured = options.filter((item) => configuredIDs.has(item.id))
  const catalog = options.filter((item) => !configuredIDs.has(item.id))

  useEffect(() => {
    if (!open) return
    setIntegrationID(defaultIntegration ?? options[0]?.id ?? "")
    setLabel("API key")
    setKey("")
    setActivate(true)
    setReveal(false)
  }, [open, defaultIntegration, options])

  const selected = options.find((item) => item.id === integrationID)

  async function submit() {
    if (!integrationID) {
      toast.push({ tone: "error", title: "Pick an integration first" })
      return
    }
    if (!key.trim()) {
      toast.push({ tone: "error", title: "API key is empty" })
      return
    }

    try {
      await connect.mutateAsync({
        integrationID,
        label: label.trim() || "API key",
        value: { type: "key", key: key.trim() },
        activate,
      })
      toast.push({
        tone: "success",
        title: "Credential stored",
        description: `${selected?.name ?? integrationID} · ${activate ? "active" : "saved"}`,
      })
      onConnected?.(integrationID)
      onClose()
    } catch (error) {
      toast.push({ tone: "error", title: "Could not store the key", description: String(error) })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect an API key"
      hint="Stored in OpenCode's local credential database. Switchboard reads it back only for this session."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={connect.isPending}>
            <KeyRound size={12} />
            {connect.isPending ? "Storing…" : "Store key"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Integration"
          hint={
            selected && selected.connections.length > 0
              ? `${selected.connections.length} existing credential${selected.connections.length === 1 ? "" : "s"} — a new one becomes active.`
              : "Custom providers appear here automatically once declared in the config."
          }
        >
          <Select value={integrationID} onChange={(event) => setIntegrationID(event.target.value)}>
            {configured.length > 0 ? (
              <optgroup label="Configured providers">
                {configured.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {option.id}
                    {option.connections.length > 0 ? " (connected)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label={`Known integrations (${catalog.length})`}>
              {catalog.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.id}
                  {option.connections.length > 0 ? " (connected)" : ""}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>

        <Field label="Label" hint="Used to tell accounts apart when one integration has several.">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="API key"
          />
        </Field>

        <Field label="Secret">
          <div className="relative">
            <Input
              type={reveal ? "text" : "password"}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              className="pr-10 font-mono text-[12px]"
            />
            <button
              type="button"
              onClick={() => setReveal((current) => !current)}
              className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-fog-dim transition-colors hover:text-bone"
              aria-label={reveal ? "Hide key" : "Show key"}
            >
              {reveal ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </Field>

        <div className="border-t border-line pt-4">
          <Toggle
            checked={activate}
            onChange={setActivate}
            label="Make this the active credential for the integration"
          />
        </div>
      </div>
    </Modal>
  )
}
