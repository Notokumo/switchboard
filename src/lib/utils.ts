import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function compactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—"
  if (value === 0) return "0"

  const units = [
    { limit: 1_000_000_000_000, suffix: "T" },
    { limit: 1_000_000_000, suffix: "B" },
    { limit: 1_000_000, suffix: "M" },
    { limit: 1_000, suffix: "K" },
  ]

  for (const unit of units) {
    if (value >= unit.limit) {
      const scaled = value / unit.limit
      return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}${unit.suffix}`
    }
  }

  return String(value)
}

export function usd(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—"
  if (value === 0) return "free"
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}

export function maskSecret(secret: string | undefined | null): string {
  if (!secret) return "—"
  const tail = secret.length > 4 ? secret.slice(-4) : secret
  return `•••• •••• ${tail}`
}

export function keyTail(secret: string | undefined | null): string {
  if (!secret) return ""
  return secret.slice(-4)
}

export function formatDate(ms: number | undefined | null): string {
  if (!ms) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(ms))
}

export function plural(count: number, single: string, many = `${single}s`): string {
  return count === 1 ? single : many
}

export function activationTone(activation: string): "signal" | "amber" | "muted" {
  if (activation === "enabled") return "signal"
  if (activation === "auto") return "amber"
  return "muted"
}

export function methodLabel(type: string): string {
  switch (type) {
    case "key":
      return "API key"
    case "oauth":
      return "OAuth"
    case "command":
      return "Command"
    case "external":
      return "External"
    case "env":
      return "Environment"
    default:
      return type
  }
}
