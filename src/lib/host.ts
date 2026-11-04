import { invoke } from "@tauri-apps/api/core"

export function hasHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!hasHost()) {
    throw new Error(
      "Switchboard needs the desktop shell. Run `npm run tauri dev` instead of opening the Vite URL.",
    )
  }

  return invoke<T>(command, args)
}
