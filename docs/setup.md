# Setting METAG up in your coding agent

Fifteen minutes from now you should have asked your agent for a film and got a
link back. This page is the shortest path there, per agent.

Every command below was run before it was written down. Where an agent's config
format could only be confirmed from its documentation rather than by running it,
that is said out loud.

---

## 1. Check you can run it at all

Before touching any config file, prove the server starts. This needs nothing
except Node 20 or newer:

```bash
npx -y github:metagai/metag-mcp --help
```

You should see the usage text. If you see an npm error instead, your Node is
too old (`node --version`) or you are behind a proxy that blocks GitHub.

## 2. Sign in once

METAG has no API key to copy. The first run opens a browser, you sign in, and
the token is written to `~/.metag/token` with mode 0600. You are not asked
again.

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y github:metagai/metag-mcp
```

This is also the check that matters most, and the one to come back to whenever
something is broken: it is the whole chain — process, sign-in, network,
gateway — with your agent taken out of the picture. A healthy run prints one
line of JSON containing `"tools":[...]`.

If you are on a machine with no browser (CI, a container, a remote shell), get
a token on a machine that has one and pass it in instead:

```bash
METAG_TOKEN=… npx -y github:metagai/metag-mcp --help
```

Never paste that token into a config file you commit. Every agent below can
read it from the environment.

## 3. Add it to your agent

Pick your agent. Each writes a different file, in a different format, in a
different place — that is why they are listed separately rather than as one
"generic MCP config".

### Claude Code

Verified with Claude Code 2.1.227.

```bash
claude mcp add metag --scope user -- npx -y github:metagai/metag-mcp
```

**The server name must come before the flags.** `claude mcp add --env X=y metag …`
fails with `Invalid environment variable format: metag`, because `--env` keeps
consuming arguments. Name first, flags after, then `--`, then the command.

Scopes: `--scope user` makes it available in every project (stored in
`~/.claude.json`). `--scope project` writes `.mcp.json` in the project root so
it can be committed — note that a project-scoped server shows
`⏸ Pending approval` until you start `claude` interactively once and approve it.
`--scope local` (the default) is this project, just for you.

By hand, `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "metag": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:metagai/metag-mcp"]
    }
  }
}
```

Check it:

```bash
claude mcp list        # metag: … - ✔ Connected
claude mcp get metag   # scope, command, environment
```

`✘ Failed to connect` here almost always means "not signed in yet" — run the
one-liner from step 2 and try again.

### OpenAI Codex CLI

Verified with codex-cli 0.141.0.

```bash
codex mcp add metag -- npx -y github:metagai/metag-mcp
```

That writes `~/.codex/config.toml`. Codex uses **TOML**, not JSON, and the key
is `mcp_servers` — plural, snake case:

```toml
[mcp_servers.metag]
command = "npx"
args = ["-y", "github:metagai/metag-mcp"]
startup_timeout_sec = 20

[mcp_servers.metag.env]
METAG_TOKEN = "…"
```

The timeout keys are `startup_timeout_sec` and `tool_timeout_sec` — seconds,
not milliseconds. The default startup timeout is 10 seconds, which `npx` can
exceed the very first time while it downloads the package; raise it, or run the
step-2 one-liner once so the download is already cached.

`codex mcp add` writes the global config. For a single project, hand-edit
`.codex/config.toml` in the project root — Codex reads it in trusted projects.

Check it:

```bash
codex mcp list   # name, command, args, env, status
```

### Kimi Code CLI

**Not verified by running it** — the config format below comes from Moonshot's
documentation, not from a local install.

Kimi Code CLI reads `~/.kimi-code/mcp.json` (all projects) or
`<project>/.kimi-code/mcp.json` (one project). Same JSON shape as Claude Code:

```json
{
  "mcpServers": {
    "metag": {
      "command": "npx",
      "args": ["-y", "github:metagai/metag-mcp"]
    }
  }
}
```

Do not put this in `~/.kimi-code/config.toml` — that file configures models and
permissions, not MCP servers.

There is no `kimi mcp add`. Inside the TUI, `/mcp-config` adds and edits
servers, and `/mcp` shows their connection status. A server added mid-session
only registers in a new session (`/new` or `/reload`).

If you are on the **older Python Kimi CLI** rather than Kimi Code CLI, the path
is `~/.kimi/mcp.json` and there is a real CLI:
`kimi mcp add --transport stdio metag -- npx -y github:metagai/metag-mcp`.

### Cursor

**Not verified by running it** — from Cursor's documentation.

`.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` globally. Identical
shape to Claude Code's `.mcp.json`. Check the result under Settings → MCP, or
in the Output panel under "MCP Logs".

### Gemini CLI

Verified with gemini 0.52.0.

```bash
gemini mcp add -s user metag npx -- -y github:metagai/metag-mcp
```

That writes `~/.gemini/settings.json` (`-s project` writes
`.gemini/settings.json`; project is the default scope, unlike Claude Code):

```json
{
  "mcpServers": {
    "metag": {
      "command": "npx",
      "args": ["-y", "github:metagai/metag-mcp"],
      "env": { "METAG_TOKEN": "$METAG_TOKEN" }
    }
  }
}
```

`env` values here expand `$VAR` from your shell, so the token need not be
written into the file. Check with `gemini mcp list`, or `/mcp` in a session.

---

## 4. The first thing to ask for

Restart your agent so it picks up the new server, then ask for the cheapest
thing METAG does:

> Quote a four-shot film about a cat learning to skateboard.

That calls `quote_film`: about five seconds, **0 credits, nothing is created**.
You get the shot list it would shoot and what each quality tier would cost. This
is the call to make before any other, and the one to lead with when you are
showing someone else.

When you actually want the film:

> Make it.

That calls `make_film` — also **0 credits**. It returns a watchable draft and a
Studio link. Nobody is charged until a person has seen the draft and said yes.
Open the link: the timeline is editable, and every generated shot remembers how
it was made, so any single shot can be re-shot without redoing the film.

---

## 5. When it does not work

| What you see | What it is | What to do |
|---|---|---|
| `✘ Failed to connect`, or the agent lists no METAG tools | Not signed in. The bridge cannot list tools until the gateway authenticates it | Run the step-2 one-liner and complete the browser sign-in, then restart the agent |
| `METAG_TOKEN was rejected by the gateway (401)` | The token you supplied is expired or from another environment | `unset METAG_TOKEN` and sign in through the browser, or mint a fresh token |
| `Not signed in, and METAG_BROWSER=0 forbids opening a browser` | Headless machine with no token | Set `METAG_TOKEN` from a machine that has a browser |
| Your terminal hangs and a browser window opens unexpectedly | First run, working as designed — that is the sign-in | Finish the sign-in. To prevent it entirely, set `METAG_BROWSER=0` and supply `METAG_TOKEN` |
| `Cannot reach the METAG gateway at … (ENOTFOUND)` | DNS or network. Corporate proxies and some regions block it | Check the address named in the message; if you overrode `METAG_API`, check that first |
| `Cannot reach the METAG gateway at … (ECONNREFUSED)` | Something is listening at that address but not METAG — usually a stale `METAG_API` pointing at a local test server | `unset METAG_API` |
| `Too many requests — METAG limits MCP calls per minute` | Your agent is looping. The limit is per user, per minute | Wait a minute. If an agent is polling `job_status`, tell it to poll every few seconds, not continuously |
| `Not enough credits` | The tier your agent picked costs more than the balance | `account_balance` to see it, then top up, or ask for fewer shots or a cheaper tier |
| The agent times out while starting the server | `npx` is downloading the package and your agent's startup timeout is shorter than the download | Run the step-2 one-liner once to warm the cache; in Codex raise `startup_timeout_sec` |
| `Re-shooting needs an active subscription` | `reshoot_shot` only works on shots made with our own engine, for subscribers | Re-shoot from the Studio timeline instead, or re-run `make_film` — drafts are free |

Still stuck: run the step-2 one-liner. If that prints a tool list, the problem
is in the agent's config; if it does not, the message it prints is the problem,
and it names what to fix.

## Environment variables

| Variable | Effect |
|---|---|
| `METAG_TOKEN` | Use this token instead of signing in through a browser. For CI |
| `METAG_BROWSER=0` | Never open a browser — neither at sign-in nor when a tool asks for a human. Tools still return links |
| `METAG_API` | Gateway address. Defaults to `https://api.metag.ai` |
