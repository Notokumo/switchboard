import { call } from "./host"
import type {
  ConfigEntry,
  ConfigFile,
  CredentialInfo,
  IntegrationInfo,
  ModelInfo,
  ProviderInfo,
  ServiceInfo,
  WriteResult,
} from "./types"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return call<T>("oc_request", { method, path, body: body ?? null })
}

export const api = {
  service: () => call<ServiceInfo>("oc_service_info"),

  providers: () => request<{ data: ProviderInfo[] }>("GET", "/api/provider").then((r) => r.data),

  provider: (id: string) =>
    request<{ data: ProviderInfo }>("GET", `/api/provider/${encodeURIComponent(id)}`).then(
      (r) => r.data,
    ),

  models: () => request<{ data: ModelInfo[] }>("GET", "/api/model").then((r) => r.data),

  integrations: () =>
    request<{ data: IntegrationInfo[] }>("GET", "/api/integration").then((r) => r.data),

  credentials: () =>
    request<{ data: CredentialInfo[] }>("GET", "/api/credential").then((r) => r.data),

  resolvedConfig: () => request<ConfigEntry[]>("GET", "/api/config"),

  reload: () => request<null>("POST", "/api/location/reload"),

  createCredential: (input: {
    integrationID: string
    label?: string
    value: { type: "key"; key: string }
    activate?: boolean
  }) => request<{ data: CredentialInfo }>("POST", "/api/credential", input).then((r) => r.data),

  renameCredential: (id: string, label: string) =>
    request<{ data: CredentialInfo }>(
      "PATCH",
      `/api/credential/${encodeURIComponent(id)}`,
      { label },
    ).then((r) => r.data),

  activateCredential: (id: string) =>
    request<{ data: CredentialInfo }>(
      "POST",
      `/api/credential/${encodeURIComponent(id)}/activate`,
    ).then((r) => r.data),

  deleteCredential: (id: string) =>
    request<null>("DELETE", `/api/credential/${encodeURIComponent(id)}`),

  configFile: () => call<ConfigFile>("oc_config_read"),

  writeConfig: (content: string) => call<WriteResult>("oc_config_write", { content }),
}
