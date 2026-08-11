# Changelog

This package is installed on other people's machines, which makes it the
slowest thing we can ever fix. Anything that changes what a running install
does is listed here.

## 0.3.0

Everything in this release came from running the bridge headless and watching
what a stranger would have seen.

### Fixed

- **Sign-in no longer opens a browser when it cannot possibly help.** If
  `METAG_TOKEN` is set and the gateway rejects it, you now get one sentence
  naming the variable instead of a browser window and a five-minute block. Same
  for `METAG_BROWSER=0`, which is documented as "never open a browser" and
  previously did not cover sign-in — the one flag a CI user could reach did not
  cover the one moment they needed it to.
- **An unreachable gateway names the address.** `fetch failed` became
  `Cannot reach the METAG gateway at https://api.metag.ai (ECONNREFUSED)`.
  Wrong region, no network and a wrong `METAG_API` all landed on the old
  message, which pointed at none of them.
- **HTTP statuses are explained, not printed.** `Gateway returned 429` became
  "Too many requests — METAG limits MCP calls per minute. Wait a moment and
  retry." Likewise for 402 (credits) and 5xx.
- **`install` writes a package spec that resolves.** It used to write
  `npx -y metag-mcp`, and that name is not on npm — the generated config could
  never start, and it failed later, inside someone else's agent. It now writes
  `npx -y github:metagai/metag-mcp`. A test asks GitHub or npm whether the spec
  actually resolves, so this cannot silently regress.

### Added

- `--version`.
- `--help` now lists the environment variables and points at `docs/setup.md`.
- `docs/setup.md`: per-agent setup for Claude Code, Codex CLI, Kimi Code,
  Cursor and Gemini CLI, each with the file path and format that agent really
  uses, plus a symptom/cause/fix table.
- A behaviour test suite (`npm test`): the bridge starts, lists tools, returns
  a real tool result, and fails auth with a sentence rather than a stack trace.

## 0.2.0

- Renamed from `@metag/mcp` to `metag-mcp` (an unscoped name needs no npm org).
- Added `npx metag-mcp install`: writes `.mcp.json` and a Claude Code skill,
  merging rather than overwriting.
- Made the public package English-first.

## 0.1.0

- First cut: stdio ↔ gateway bridge, browser sign-in, token cached at
  `~/.metag/token` (mode 0600).
