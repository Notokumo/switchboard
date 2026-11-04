# Switchboard

A desktop control panel for **OpenCode 2** providers, models and credentials.

- **Platform:** Windows desktop only (tested on Windows 11).
- **Not affiliated** with or endorsed by OpenCode. Switchboard talks to the OpenCode service on your
  machine and edits your local `opencode.jsonc`.
- **License:** MIT (see [LICENSE](LICENSE)).

Switchboard fills the gap left by the removal of the "custom provider" button in OpenCode V2:

- **Providers** — inspect every configured provider, its runtime package, settings and activation
  state, and add a new OpenAI-compatible provider without hand-editing JSON.
- **Models** — browse the resolved model catalog with context limits, pricing, capabilities and
  variants, and declare extra models on any provider in the config.
- **Credentials** — list stored accounts, mask or reveal secrets, activate, add and remove keys for
  any integration (including custom providers).
- **Config** — edit `opencode.jsonc` directly, with JSONC validation, formatting, a line diff before
  saving, timestamped backups and a server reload after the write.

## Architecture

```
┌──────────────────────────────┐
│ React + Vite (webview)       │
│  TanStack Query / Table      │
└──────────────┬───────────────┘
               │ Tauri invoke (no CORS, no secrets in JS)
┌──────────────▼───────────────┐
│ Rust bridge                  │
│  • reads service.json        │
│  • proxies /api/* with auth  │
│  • reads/writes opencode.jsonc│
└──────┬────────────────┬──────┘
       │ HTTP           │ file I/O
┌──────▼───────┐  ┌─────▼──────────────┐
│ OpenCode     │  │ ~/.config/opencode │
│ background   │  │ opencode.jsonc     │
│ service      │  │ + .switchboard-    │
│              │  │   backups/         │
└──────────────┘  └────────────────────┘
```

Why a Rust proxy instead of calling the API from the webview:

1. The service uses HTTP Basic auth with a per-install password. The webview never sees it.
2. Tauri's custom protocol origin would otherwise need `opencode service set cors ...`.
3. File reads and writes happen next to the server, with atomic replace and backups.

## Stack

| Layer     | Choice                                              |
| --------- | --------------------------------------------------- |
| Shell     | Tauri 2                                             |
| UI        | React 19, TypeScript, Vite 8                        |
| Styling   | Tailwind CSS 4, Archivo + IBM Plex Mono (bundled)   |
| Data      | TanStack Query 5, TanStack Table 8                  |
| Config    | `jsonc-parser` (comment-preserving edits), `diff`   |
| Bridge    | Rust, `reqwest`, `serde_json`                       |

## Requirements

- Node.js 20+
- Rust stable (`rustup`) with the MSVC toolchain on Windows
- Visual Studio Build Tools with the C++ workload
- OpenCode 2 running locally (`opencode service status`)

## Run

```bash
npm install
npm run tauri dev
```

Production bundle:

```bash
npm run tauri build
```

Frontend-only build check:

```bash
npm run build
```

> Rust build artifacts go to `src-tauri/target` by default. If your system drive is short on space,
> point Cargo elsewhere before building, for example:
>
> ```powershell
> $env:CARGO_TARGET_DIR = "D:\cargo\switchboard"
> ```

> Opening `http://localhost:1420` in a normal browser shows a "Desktop shell required" screen by
> design: the Tauri bridge is the only path to the service.

## Where data comes from

| Data         | Source                                              |
| ------------ | --------------------------------------------------- |
| Providers    | `GET /api/provider`                                 |
| Models       | `GET /api/model`                                    |
| Integrations | `GET /api/integration`                              |
| Credentials  | `GET/POST/PATCH/DELETE /api/credential`             |
| Activation   | computed by the server from credentials and config  |
| Config       | `~/.config/opencode/opencode.jsonc` (direct file)   |
| Reload       | `POST /api/location/reload`                         |

There is no general "write provider" endpoint in OpenCode 2.2.5 (`PATCH /api/experimental/config`
only accepts `shell`), so provider edits are applied to the config file, then the server is asked to
reload.

## Safety rules

- Every config write creates `~/.config/opencode/.switchboard-backups/opencode-<timestamp>.jsonc`.
- The file is replaced via a temporary file, not truncated in place.
- The UI shows a diff before saving manual edits.
- Adding a provider refuses to overwrite an existing id, including a legacy `provider.<id>` entry.
- Adding a model targets whichever root already declares the provider (`providers` or legacy
  `provider`) and refuses to shadow an existing model id.
- Credentials live in OpenCode's SQLite database. Switchboard never persists a copy and masks secrets
  until the user reveals them.
- The HTTP bridge listens to nothing: it only makes outbound requests to the registered service.

## Known limitations

- Provider/model creation writes the native **V2** shape. Legacy `provider`/`npm`/`options` entries
  are read fine but not rewritten automatically.
- OAuth and device flows are not implemented in the UI yet; use `/connect` inside OpenCode for those.
- The provider, model and integration endpoints are marked experimental upstream and may change
  between releases. Keep the API adapter (`src/lib/api.ts`) as the single integration point.
- No live event subscription yet (`GET /api/event`); views refresh after mutations and on reload.

## Layout

```
src/
  components/   Shell, DataTable, dialogs, design system
  lib/          api, config editing, queries, types
  views/        Overview, Providers, Models, Credentials, Config
src-tauri/
  src/lib.rs    service discovery, HTTP proxy, config read/write
```
