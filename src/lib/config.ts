import { applyEdits, format, modify, parse, printParseErrorCode, type ParseError } from "jsonc-parser"
import { diffLines } from "diff"

export interface ParseResult {
  value: Record<string, unknown> | null
  errors: { message: string; offset: number; length: number }[]
}

export function parseConfig(text: string): ParseResult {
  const errors: ParseError[] = []
  const value = parse(text, errors, { allowTrailingComma: true, disallowComments: false })

  return {
    value: value as Record<string, unknown> | null,
    errors: errors.map((error) => ({
      message: printParseErrorCode(error.error),
      offset: error.offset,
      length: error.length,
    })),
  }
}

export function formatConfig(text: string): string {
  return applyEdits(
    text,
    format(text, undefined, { insertSpaces: true, tabSize: 2, eol: "\n" }),
  )
}

export function configDiff(before: string, after: string) {
  return diffLines(before, after)
}

export function lineOfOffset(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length
}

export interface NewProviderInput {
  id: string
  name: string
  packageId: string
  baseURL: string
  env: string
  modelIds: string[]
}

export function providerPackageOptions(): { value: string; label: string }[] {
  return [
    {
      value: "@opencode/ai/providers/openai-compatible",
      label: "OpenAI compatible (chat completions)",
    },
    {
      value: "@opencode/ai/providers/openai-compatible/responses",
      label: "OpenAI compatible (responses)",
    },
    { value: "@opencode/ai/providers/openai", label: "OpenAI native" },
    { value: "@opencode/ai/providers/anthropic-compatible", label: "Anthropic compatible" },
    { value: "@opencode/ai/providers/google", label: "Google" },
    { value: "@opencode/ai/providers/openrouter", label: "OpenRouter" },
  ]
}

export function providerSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildProviderEntry(input: NewProviderInput) {
  const models: Record<string, { name: string }> = {}

  for (const modelID of input.modelIds) {
    const trimmed = modelID.trim()
    if (trimmed) models[trimmed] = { name: trimmed }
  }

  const entry: Record<string, unknown> = {
    name: input.name.trim() || input.id,
    package: input.packageId,
    models,
  }

  if (input.env.trim()) entry.env = [input.env.trim().toUpperCase()]

  if (input.baseURL.trim()) {
    entry.settings = { baseURL: input.baseURL.trim() }
  }

  return entry
}

export function addProviderToConfig(text: string, input: NewProviderInput): string {
  const id = providerSlug(input.id)

  if (!id) throw new Error("Provider id is required.")
  if (input.modelIds.filter((model) => model.trim()).length === 0) {
    throw new Error("Add at least one model id.")
  }

  const parsed = parseConfig(text)
  if (parsed.errors.length > 0) {
    throw new Error(
      `The config file has a syntax error at line ${lineOfOffset(text, parsed.errors[0].offset)}. Fix it before adding a provider.`,
    )
  }

  const info = (parsed.value ?? {}) as Record<string, unknown>
  const v2Providers = (info.providers ?? {}) as Record<string, unknown>
  const v1Providers = (info.provider ?? {}) as Record<string, unknown>

  if (v2Providers[id]) throw new Error(`providers.${id} already exists in the config.`)
  if (v1Providers[id]) {
    throw new Error(
      `The legacy provider.${id} entry already exists. Rename it or migrate the config to the V2 shape first.`,
    )
  }

  const edits = modify(text, ["providers", id], buildProviderEntry(input), {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
  })

  return applyEdits(text, edits)
}

export interface NewModelInput {
  providerID: string
  modelID: string
  name: string
  context?: number
  output?: number
}

function providerRoot(info: Record<string, unknown>, providerID: string): string | null {
  const v2 = (info.providers ?? {}) as Record<string, unknown>
  if (v2[providerID]) return "providers"

  const v1 = (info.provider ?? {}) as Record<string, unknown>
  if (v1[providerID]) return "provider"

  return null
}

export function addModelToConfig(text: string, input: NewModelInput): string {
  const providerID = providerSlug(input.providerID)
  const modelID = input.modelID.trim()

  if (!providerID) throw new Error("Provider id is required.")
  if (!modelID) throw new Error("Model id is required.")

  const parsed = parseConfig(text)
  if (parsed.errors.length > 0) {
    throw new Error(
      `The config file has a syntax error at line ${lineOfOffset(text, parsed.errors[0].offset)}. Fix it before adding a model.`,
    )
  }

  const info = (parsed.value ?? {}) as Record<string, unknown>
  const root = providerRoot(info, providerID)

  if (!root) {
    throw new Error(
      `${providerID} is not declared in this config file. It may come from a package or another config source, so Switchboard will not edit it.`,
    )
  }

  const entry = (info[root] as Record<string, Record<string, unknown>>)[providerID]
  const models = (entry.models ?? {}) as Record<string, unknown>

  if (models[modelID]) {
    throw new Error(`${root}.${providerID}.models.${modelID} already exists.`)
  }

  const definition: Record<string, unknown> = { name: input.name.trim() || modelID }

  if (input.context || input.output) {
    definition.limit = {
      ...(input.context ? { context: input.context } : {}),
      ...(input.output ? { output: input.output } : {}),
    }
  }

  const edits = modify(text, [root, providerID, "models", modelID], definition, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
  })

  return applyEdits(text, edits)
}

