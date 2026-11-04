export type Activation = "auto" | "enabled" | "disabled"

export interface ProviderInfo {
  id: string
  name: string
  activation: Activation
  package: string
  canonical?: string
  integrationID?: string
  settings?: Record<string, unknown>
  compatibility?: Record<string, unknown>
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface ModelCapabilities {
  tools: boolean
  input: string[]
  output: string[]
  temperature?: boolean
  reasoning?: boolean
}

export interface ModelCost {
  input: number
  output: number
  cache?: { read: number; write: number }
}

export interface ModelVariant {
  id: string
  settings?: Record<string, unknown>
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface ModelInfo {
  id: string
  modelID: string
  providerID: string
  name: string
  type: string
  family?: string
  package?: string
  capabilities: ModelCapabilities
  variants: ModelVariant[]
  time: { released: number }
  cost: ModelCost[]
  status: "alpha" | "beta" | "deprecated" | "active"
  enabled: boolean
  limit: { context: number; input?: number; output: number }
  settings?: Record<string, unknown>
}

export interface IntegrationMethod {
  type: "key" | "oauth" | "command" | "external" | "env" | string
  id?: string
  label?: string
}

export interface ConnectionInfo {
  type: "credential" | "env" | string
  id?: string
  label?: string
  method?: string
  variable?: string
}

export interface IntegrationInfo {
  id: string
  name: string
  methods: IntegrationMethod[]
  connections: ConnectionInfo[]
}

export type CredentialValue =
  | { type: "key"; key: string; metadata?: Record<string, unknown> }
  | {
      type: "oauth"
      access?: string
      refresh?: string
      expires?: number
      methodID?: string
      metadata?: Record<string, unknown>
    }
  | { type: string; [key: string]: unknown }

export interface CredentialInfo {
  id: string
  integrationID: string
  label: string
  active: boolean
  value: CredentialValue
}

export interface ConfigEntry {
  type: "document" | "directory"
  path: string
  info: Record<string, unknown>
}

export interface ServiceInfo {
  url: string
  version: string
  pid: number
}

export interface ConfigFile {
  path: string
  exists: boolean
  content: string
  backups: string
}

export interface WriteResult {
  path: string
  backup: string | null
}
