# @metag/mcp

Turn one sentence into a film, then **hand it to a person to cut**.

METAG's MCP server. Generation runs on our own engine (about 3 seconds of
footage per shot, an order of magnitude cheaper than calling a comparable
API); editing happens on a real timeline — and the two are connected: every
shot the agent generates remembers how it was made, so a person can
right-click on the timeline and re-shoot just that shot.

[中文说明](./README.zh-CN.md)

## Install

Works today — the package is hosted on our own CDN, no npm account needed:

```bash
# Claude Code
claude mcp add metag -- npx -y https://s3.metag.ai/metag/metag/cli/metag-mcp-latest.tgz
```

```jsonc
// Other MCP clients (Claude Desktop / Cursor / Codex …)
{
  "mcpServers": {
    "metag": {
      "command": "npx",
      "args": ["-y", "https://s3.metag.ai/metag/metag/cli/metag-mcp-latest.tgz"]
    }
  }
}
```

To pin a version, replace `latest` with a specific one, e.g.
`metag-mcp-0.1.0.tgz` — that URL is immutable, while `latest` follows updates.

Once published to npm this becomes `npx -y @metag/mcp`; the URL above keeps
working either way.

**No API key to obtain first.** The first call opens a browser to sign in and
stores the token at `~/.metag/token` (mode 0600). You are not asked again.

## What the agent gets

| Tool | When to use it |
|---|---|
| `make_film` | The user wants a film. **0 credits** — produces a draft for a human to look at first, rather than spending their money straight away |
| `open_in_studio` | Human taste is needed (pick takes, adjust pacing, add their own footage). Opens the browser directly on that timeline |
| `reshoot_shot` | The user says "shot three is wrong". **Re-shoots only that shot** instead of regenerating the whole film and throwing away their edit |
| `list_takes` / `promote_take` | Inspect alternates and quality scores, then commit one. Reversible — the replaced take is kept |
| `get_recipe` | Fetch per-shot prompts and narration. Same document Studio exports; hand it to a person or feed it back to rebuild |
| `generate_video` / `job_status` | Render directly (**charges immediately**) and poll |
| `run_director` / `approve_run` | Use this path when the price must be shown to a human first |
| `edit_image` / `synthesize_speech` / `account_balance` | Edit an image, synthesize speech, check the balance |

Full parameters at <https://metag.ai/docs>. The tool list is served by the
gateway and this package keeps no copy of it — when the server adds a tool,
you do not need to upgrade.

## Environment

| Variable | Effect |
|---|---|
| `METAG_TOKEN` | Supply a token directly and skip the browser sign-in (for CI) |
| `METAG_BROWSER=0` | Never open a browser. Tools still return links; nothing is lost |
| `METAG_API` | Gateway address, defaults to `https://api.metag.ai` |

## Billing

Drafts are free. Rendering is billed per shot; subscribers are not billed per
render on our own engine (fair-use limits apply). Failed generations are
refunded automatically. Prices at <https://metag.ai/#pricing> are
authoritative.

## Source

This repository is published from the `mcp-bridge/` directory of the METAG
monorepo with `git subtree push`, so the two never drift.

## License

Commercial license at <https://metag.ai/terms-of-use.html>.
