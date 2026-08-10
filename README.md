# metag-mcp

Turn one sentence into a film, then **hand it to a person to cut**.

METAG's MCP server. Generation runs on our own engine (about 3 seconds of
footage per shot, an order of magnitude cheaper than calling a comparable
API); editing happens on a real timeline — and the two are connected: every
shot the agent generates remembers how it was made, so a person can
right-click on the timeline and re-shoot just that shot.

[中文说明](./README.zh-CN.md)

## Install

```bash
npx metag-mcp install
```

That writes two things into the current project and touches nothing else:

- `.mcp.json` — the MCP server entry (merged; other servers are left alone)
- `.claude/skills/metag/SKILL.md` — when to use it, and the one rule that
  matters: **draft free, charge only after the person has seen it**

Restart your agent and ask it for a film.

<details>
<summary>By hand, or for clients without <code>.mcp.json</code></summary>

```bash
claude mcp add metag -- npx -y metag-mcp
```

```jsonc
// Claude Desktop / Cursor / Codex …
{
  "mcpServers": {
    "metag": { "command": "npx", "args": ["-y", "metag-mcp"] }
  }
}
```

To pin a version: `npx -y metag-mcp@0.2.0`.

</details>

**No API key to obtain first.** The first call opens a browser to sign in and
stores the token at `~/.metag/token` (mode 0600). You are not asked again.

## What the agent gets

| Tool | When to use it |
|---|---|
| `quote_film` | The user asks for a video and hasn't decided yet. **0 credits, creates nothing** — returns the shot list and each tier's price in ~5s, so you can say what you'd shoot and what it costs before spending their time |
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
