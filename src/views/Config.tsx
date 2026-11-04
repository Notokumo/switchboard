import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Save, RotateCcw, Wand2, FileJson } from "lucide-react"
import { Badge, Button, EmptyState, KeyValue, Modal, Panel, PanelHead, Spinner, useToast } from "../components/ui"
import { api } from "../lib/api"
import { configDiff, formatConfig, lineOfOffset, parseConfig } from "../lib/config"
import { useConfigFile, useRefreshAll } from "../lib/queries"

const STARTER = `{
  "$schema": "https://opencode.ai/config.json",
  "providers": {}
}
`

function PathValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line/70 py-2 last:border-0">
      <div className="label mb-1">{label}</div>
      <div className="break-all font-mono text-[10.5px] leading-relaxed text-fog">{value}</div>
    </div>
  )
}

export function ConfigView() {
  const config = useConfigFile()
  const refreshAll = useRefreshAll()
  const toast = useToast()

  const [text, setText] = useState("")
  const [savedText, setSavedText] = useState("")
  const [ready, setReady] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [backup, setBackup] = useState<string | null>(null)
  const gutterRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!config.data) return

    const incoming = config.data.content || STARTER

    if (!ready) {
      setText(incoming)
      setSavedText(incoming)
      setReady(true)
      return
    }

    // Adopt changes written elsewhere (provider/model dialogs) while the editor is clean.
    if (text === savedText && incoming !== savedText) {
      setText(incoming)
      setSavedText(incoming)
    }
  }, [config.data, ready, text, savedText])

  const parsed = useMemo(() => parseConfig(text), [text])
  const dirty = ready && text !== savedText
  const lineCount = text.split("\n").length
  const bytes = new Blob([text]).size

  const diff = useMemo(
    () => (diffOpen ? configDiff(savedText, text) : []),
    [diffOpen, savedText, text],
  )

  async function reloadFromDisk() {
    const file = await api.configFile()
    const next = file.content || STARTER
    setText(next)
    setSavedText(next)
    setReady(true)
    toast.push({ tone: "info", title: "File re-read", description: file.path })
  }

  async function commit() {
    setSaving(true)
    let result
    try {
      result = await api.writeConfig(text)
    } catch (error) {
      toast.push({ tone: "error", title: "Save failed", description: String(error) })
      setSaving(false)
      return
    }

    setSavedText(text)
    setBackup(result.backup)
    setDiffOpen(false)
    refreshAll()

    try {
      await api.reload()
      toast.push({
        tone: "success",
        title: "Config saved and reloaded",
        description: result.backup ? `Backup: ${result.backup}` : "No previous file to back up.",
      })
    } catch (error) {
      toast.push({
        tone: "error",
        title: "Saved, but reload failed",
        description: `${String(error)}. The file was written; reload OpenCode manually.`,
      })
    } finally {
      setSaving(false)
    }
  }

  if (config.isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center gap-3 text-fog-dim">
        <Spinner />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]">reading config</span>
      </div>
    )
  }

  if (config.isError) {
    return <EmptyState title="Could not read the config file" hint={String(config.error)} />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="flex h-[calc(100vh-250px)] min-h-[380px] min-w-0 flex-col">
          <PanelHead
            title="opencode.jsonc"
            hint={config.data?.path}
            actions={
              <>
                <Badge tone={parsed.errors.length > 0 ? "danger" : "signal"}>
                  {parsed.errors.length > 0
                    ? `${parsed.errors.length} syntax error${parsed.errors.length === 1 ? "" : "s"}`
                    : "valid jsonc"}
                </Badge>
                <Badge tone={dirty ? "amber" : "muted"}>{dirty ? "unsaved" : "synced"}</Badge>
              </>
            }
          />

          <div className="flex min-h-0 min-w-0 flex-1">
            <pre
              ref={gutterRef}
              aria-hidden
              className="w-12 shrink-0 overflow-hidden border-r border-line bg-ink/40 py-3 text-right font-mono text-[11px] leading-[1.75] text-fog-dim/50"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index} className="pr-2">
                  {index + 1}
                </div>
              ))}
            </pre>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onScroll={(event) => {
                if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop
              }}
              spellCheck={false}
              wrap="off"
              className="min-h-0 flex-1 resize-none overflow-auto bg-transparent py-3 pl-3 pr-4 font-mono text-[11.5px] leading-[1.75] text-bone caret-amber focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fog-dim">
              <span className="shrink-0 whitespace-nowrap">{lineCount} lines</span>
              <span className="shrink-0 whitespace-nowrap">{(bytes / 1024).toFixed(2)} kb</span>
              <span className="truncate normal-case tracking-normal text-fog-dim/70">
                {config.data?.backups}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText(formatConfig(text))}
                disabled={parsed.errors.length > 0}
              >
                <Wand2 size={12} />
                Format
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText(savedText)}
                disabled={!dirty}
              >
                <RotateCcw size={12} />
                Revert
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDiffOpen(true)}
                disabled={!dirty || parsed.errors.length > 0}
              >
                <Save size={12} />
                Review & save
              </Button>
            </div>
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHead title="File" />
            <div className="px-4 py-2">
              <PathValue label="path" value={config.data?.path ?? "—"} />
              <KeyValue label="exists">{config.data?.exists ? "yes" : "no"}</KeyValue>
              <PathValue label="backups" value={config.data?.backups ?? "—"} />
              {backup ? <PathValue label="last backup" value={backup} /> : null}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Button variant="outline" size="sm" className="w-full" onClick={reloadFromDisk}>
                <FileJson size={12} />
                Re-read from disk
              </Button>
            </div>
          </Panel>

          {parsed.errors.length > 0 ? (
            <Panel className="border-danger/30">
              <PanelHead title="Syntax" hint="Fix before saving" />
              <div className="space-y-2 px-4 py-3">
                {parsed.errors.slice(0, 6).map((error, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0 text-danger" />
                    <span className="font-mono text-[10px] leading-relaxed text-danger">
                      line {lineOfOffset(text, error.offset)} · {error.message}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : (
            <div className="border border-line bg-panel/40 px-3 py-3">
              <div className="label mb-1.5">Guardrails</div>
              <p className="text-[10.5px] leading-relaxed text-fog-dim">
                Switchboard writes a timestamped backup to{" "}
                <code className="font-mono text-fog">.switchboard-backups</code> before replacing the file,
                then asks the server to reload. Changes are applied without restarting OpenCode.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        title="Review configuration change"
        hint="Only lines that differ are shown. Saving replaces the file and reloads the server."
        width="max-w-[820px]"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDiffOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={commit} disabled={saving}>
              <Save size={12} />
              {saving ? "Saving…" : "Save & reload"}
            </Button>
          </>
        }
      >
        <div className="max-h-[52vh] overflow-auto border border-line bg-ink">
          {diff.map((part, index) => {
            const lines = part.value.split("\n")
            if (lines[lines.length - 1] === "") lines.pop()

            return (
              <div key={index}>
                {lines.map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={`whitespace-pre px-3 font-mono text-[11px] leading-[1.7] ${
                      part.added
                        ? "bg-signal/10 text-signal"
                        : part.removed
                          ? "bg-danger/10 text-danger"
                          : "text-fog-dim"
                    }`}
                  >
                    <span className="mr-2 inline-block w-3 select-none opacity-60">
                      {part.added ? "+" : part.removed ? "−" : " "}
                    </span>
                    {line || " "}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
