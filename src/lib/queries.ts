import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "./api"

export const qk = {
  service: ["service"] as const,
  providers: ["providers"] as const,
  models: ["models"] as const,
  integrations: ["integrations"] as const,
  credentials: ["credentials"] as const,
  configFile: ["config-file"] as const,
}

export function useService() {
  return useQuery({
    queryKey: qk.service,
    queryFn: api.service,
    retry: 1,
    staleTime: 10_000,
  })
}

export function useProviders() {
  return useQuery({ queryKey: qk.providers, queryFn: api.providers, staleTime: 10_000 })
}

export function useModels() {
  return useQuery({ queryKey: qk.models, queryFn: api.models, staleTime: 20_000 })
}

export function useIntegrations() {
  return useQuery({
    queryKey: qk.integrations,
    queryFn: api.integrations,
    staleTime: 10_000,
  })
}

export function useCredentials() {
  return useQuery({
    queryKey: qk.credentials,
    queryFn: api.credentials,
    staleTime: 10_000,
  })
}

export function useConfigFile() {
  return useQuery({ queryKey: qk.configFile, queryFn: api.configFile, staleTime: Infinity })
}

export function useConnectKey() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: api.createCredential,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.credentials })
      client.invalidateQueries({ queryKey: qk.integrations })
      client.invalidateQueries({ queryKey: qk.providers })
      client.invalidateQueries({ queryKey: qk.models })
    },
  })
}

export function useActivateCredential() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: api.activateCredential,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.credentials })
      client.invalidateQueries({ queryKey: qk.providers })
      client.invalidateQueries({ queryKey: qk.models })
    },
  })
}

export function useDeleteCredential() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: api.deleteCredential,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.credentials })
      client.invalidateQueries({ queryKey: qk.integrations })
      client.invalidateQueries({ queryKey: qk.providers })
      client.invalidateQueries({ queryKey: qk.models })
    },
  })
}

export function useRefreshAll() {
  const client = useQueryClient()

  return () => {
    client.invalidateQueries()
  }
}
