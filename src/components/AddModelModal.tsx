import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button, Field, Input, Modal, Select, useToast } from "./ui"
import { api } from "../lib/api"
import { addModelToConfig, parseConfig } from "../lib/config"
import { useRefreshAll } from "../lib/queries"

interface Draft {
  modelID: string
  name: string
  context: string
  output: string
}

const EMPTY: Draft = { modelID: "", name: "", context: "", output: "" }

function declaredProviders(text: string): string[] {
  const info = (parseConfig(text).value ?? {}) as Record<string, unknown>
  const v2 = Object.keys((info.providers ?? {}) as Record<string, unknown>)
  const v1 = Object.keys((info.provider ?? {}) as Record<string, unknown>)

  return Array.from(new Set([...v2, ...v1]))
}

export function AddModelModal({
  open,
  onClose,
  providerID,
  providers,
}: {
  open: boolean
  onClose: () => void
  providerID?: string
  providers?: { id: string; name: string }[]
}) {
  const toast = useToast()
  const refreshAll = useRefreshAll()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [chosen, setChosen] = useState(providerID ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [declared, setDeclared] = useState<string[] | null>(null)

  // Only providers written in opencode.jsonc can be extended here.
  useEffect(() => {
    if (!open) return

    let active = true
    setDeclared(null)

    api
      .configFile()
      .then((file) => {
        if (active) setDeclared(declaredProviders(file.content))
      })
      .catch(() => {
        if (active) setDeclared([])
      })

    return () => {
      active = false
    }
  }, [open])

  const options = useMemo(() => {
    const all = providers ?? []

    return declared === null ? all : all.filter((provider) => declared.includes(provider.id))
  }, [declared, providers])

  useEffect(() => {
    if (!open) return

    setDraft(EMPTY)
    setError(null)
    setSaving(false)
  }, [open])

  useEffect(() => {
    if (!open || providerID || declared === null) return

    setChosen(options[0]?.id ?? "")
  }, [open, providerID, declared, options])

  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }))

  async function submit() {
    setError(null)

    if (!chosen) {
      setError("No editable provider was found in opencode.jsonc. Add a provider first.")
      return
    }

    setSaving(true)

    try {
      const file = await api.configFile()
      const next = addModelToConfig(file.content, {
        providerID: chosen,
        modelID: draft.modelID,
        name: draft.name,
        context: draft.context ? Number(draft.context) : undefined,
        output: draft.output ? Number(draft.output) : undefined,
      })
      const result = await api.writeConfig(next)
      await api.reload()
      refreshAll()

      toast.push({
        tone: "success",
        title: "Model added",
        description: result.backup ? `Backup: ${result.backup}` : "New config created.",
      })
      onClose()
    } catch (submitError) {
      setError(String(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a model"
      hint={`Declares one model under an existing provider. The upstream id must match what the endpoint serves.`}
      width="max-w-[520px]"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            <Plus size={12} />
            {saving ? "Writing…" : "Write model"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {providerID ? null : (
          <Field
            label="Provider"
            hint={
              declared === null
                ? "Checking which providers are declared in opencode.jsonc…"
                : options.length === 0
                  ? "No provider in opencode.jsonc can be extended. Add a provider first."
                  : "Only providers declared in opencode.jsonc can be extended here."
            }
          >
            <Select value={chosen} onChange={(event) => setChosen(event.target.value)}>
              {options.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.id}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Model id" hint="Sent as the upstream model name, e.g. qwen3-coder-plus.">
          <Input
            value={draft.modelID}
            onChange={(event) => patch({ modelID: event.target.value })}
            placeholder="qwen3-coder-plus"
            spellCheck={false}
            className="font-mono text-[12px]"
          />
        </Field>

        <Field label="Display name" hint="Falls back to the model id when empty.">
          <Input
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Qwen3 Coder Plus"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Context limit" hint="Optional. Tokens.">
            <Input
              value={draft.context}
              onChange={(event) => patch({ context: event.target.value.replace(/[^0-9]/g, "") })}
              placeholder="131072"
              inputMode="numeric"
              className="font-mono text-[12px]"
            />
          </Field>
          <Field label="Output limit" hint="Optional. Tokens.">
            <Input
              value={draft.output}
              onChange={(event) => patch({ output: event.target.value.replace(/[^0-9]/g, "") })}
              placeholder="32768"
              inputMode="numeric"
              className="font-mono text-[12px]"
            />
          </Field>
        </div>

        {error ? (
          <p className="border border-danger/40 bg-danger/5 px-3 py-2 text-[11px] leading-relaxed text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
