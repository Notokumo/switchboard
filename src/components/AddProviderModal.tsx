import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button, Field, Input, Modal, Select, useToast } from "./ui"
import { api } from "../lib/api"
import { addProviderToConfig, buildProviderEntry, providerPackageOptions, providerSlug, type NewProviderInput } from "../lib/config"
import { useRefreshAll } from "../lib/queries"

const EMPTY: NewProviderInput = {
  id: "",
  name: "",
  packageId: "@opencode/ai/providers/openai-compatible",
  baseURL: "",
  env: "",
  modelIds: [""],
}

export function AddProviderModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded?: (providerID: string) => void
}) {
  const toast = useToast()
  const refreshAll = useRefreshAll()
  const [input, setInput] = useState<NewProviderInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setInput(EMPTY)
      setError(null)
      setSaving(false)
    }
  }, [open])

  const patch = (changes: Partial<NewProviderInput>) =>
    setInput((current) => ({ ...current, ...changes }))

  const preview = useMemo(() => {
    try {
      if (!input.id.trim()) return null
      return JSON.stringify(buildProviderEntry(input), null, 2)
    } catch {
      return null
    }
  }, [input])

  async function submit() {
    setError(null)
    setSaving(true)

    try {
      const file = await api.configFile()
      const next = addProviderToConfig(file.content, input)
      const result = await api.writeConfig(next)
      await api.reload()
      refreshAll()

      toast.push({
        tone: "success",
        title: "Provider written to config",
        description: result.backup ? `Backup: ${result.backup}` : "New config created.",
      })

      onAdded?.(providerSlug(input.id))
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
      title="Add a custom provider"
      hint="Writes a V2 providers entry to opencode.jsonc, backs up the file, then reloads the server."
      width="max-w-[680px]"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            <Plus size={12} />
            {saving ? "Writing…" : "Write provider"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Provider id" hint="Used in model references, e.g. acme/qwen3-coder.">
          <Input
            value={input.id}
            onChange={(event) => patch({ id: event.target.value })}
            placeholder="acme"
            spellCheck={false}
            className="font-mono text-[12px]"
          />
        </Field>
        <Field label="Display name">
          <Input
            value={input.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Acme"
          />
        </Field>

        <Field label="Package" className="col-span-2">
          <Select
            value={input.packageId}
            onChange={(event) => patch({ packageId: event.target.value })}
          >
            {providerPackageOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.value}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Base URL" hint="Include the version prefix, usually /v1." className="col-span-2">
          <Input
            value={input.baseURL}
            onChange={(event) => patch({ baseURL: event.target.value })}
            placeholder="https://llm.acme.example/v1"
            spellCheck={false}
            className="font-mono text-[12px]"
          />
        </Field>

        <Field
          label="Credential env var"
          hint="Recommended over storing the secret in the config file."
          className="col-span-2"
        >
          <Input
            value={input.env}
            onChange={(event) => patch({ env: event.target.value })}
            placeholder="ACME_API_KEY"
            spellCheck={false}
            className="font-mono text-[12px]"
          />
        </Field>

        <Field
          label="Models"
          hint="One model id per line. These are added under the provider's models map."
          className="col-span-2"
        >
          <textarea
            value={input.modelIds.join("\n")}
            onChange={(event) => patch({ modelIds: event.target.value.split("\n") })}
            rows={4}
            spellCheck={false}
            className="w-full resize-y border border-line-bright bg-ink/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-bone placeholder:text-fog-dim/70 focus:border-amber/60 focus:outline-none"
            placeholder={"qwen3-coder\ngpt-6-luna"}
          />
        </Field>
      </div>

      {preview ? (
        <div className="mt-4">
          <div className="label mb-1.5">Config preview</div>
          <pre className="max-h-44 overflow-auto border border-line bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-fog">
            {preview}
          </pre>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 border border-danger/40 bg-danger/5 px-3 py-2 text-[11px] leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}

