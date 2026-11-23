# metag-mcp

## Fengsheng · 缝声

Direct the sound of an existing cut in chat, or plan a film with METAG first. Keep one brief as you adjust the dialogue, Foley and score. When you approve the brief, Fengsheng queues the job and returns the available files once processing completes.

**Install in Claude Code** with Node.js 20 or later. In Claude Code, run:

```text
/plugin marketplace add metagai/metag-mcp
/plugin install fengsheng@metag-studio
```

Reload plugins or start a new session. Sign in to the services you use when prompted. Start with “Ask Fengsheng which sound styles are available.” For a project, try “Keep the dialogue and the footsteps at 0:04. Add music only after the last word. Show me the brief before starting.” 也可以用中文，比如“保留第 4 秒的脚步声，最后一句台词结束后才进配乐。先给我看需求单。”

**Bring a cut from METAG** by exporting the cut you choose, uploading it under your Fengsheng account, and pasting the returned media reference into the conversation. Uploading and drafting are separate from confirming production. Film generation and sound production use separate approvals. [Upload your cut](https://metag-ai.com/guide/#chat-upload)

**Other chat clients** with remote MCP and OAuth support can connect to `https://metag-ai.com/fengsheng/mcp` for sound production. That endpoint exposes the Fengsheng tools. The Claude Code package also includes the METAG film bridge. Workspace administrators may need to enable custom connections. [Setup guide](https://metag-ai.com/guide/) · [Privacy](https://metag-ai.com/privacy.html)

Try the official MCP Registry entry or follow the private ChatGPT workspace setup. The guide includes a four-second test cut and a recording of its sound brief through delivery. [MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/com.metag-ai%2Ffengsheng/versions/latest) · [ChatGPT setup and walkthrough](docs/fengsheng-support.md)

## METAG film bridge

**Give your coding agent the ability to make a film — and to hand it to a
person to cut.**

METAG's MCP server. Your agent describes a video; METAG storyboards it, writes
and voices the narration, renders the shots, and returns a link to an editable
timeline. Generation runs on our own engine (about three seconds of footage per
shot, an order of magnitude cheaper than calling a comparable API). Every shot
it generates remembers how it was made, so a person can right-click on the
timeline and re-shoot just that one.

For anyone using **Claude Code, Codex CLI, Kimi Code, Cursor or Gemini CLI**.
Node 20 or newer. No API key to obtain first.

[中文说明](./README.zh-CN.md)

## Install

```bash
npx -y github:metagai/metag-mcp install
```

That writes two things into the current project and touches nothing else:

- `.mcp.json` — the MCP server entry, merged; other servers are left alone
- `.claude/skills/metag/SKILL.md` — when to use it, and the one rule that
  matters: **draft free, charge only after the person has seen it**

Restart your agent and ask it for a film.

Your agent's config file is not `.mcp.json`? Codex uses TOML, Kimi Code uses a
different path, Gemini uses another one again — **[docs/setup.md](docs/setup.md)
has the exact file, format and command for each**, plus a symptom-to-fix table.

### Check it works

This is the whole chain — process, sign-in, network, gateway — with your agent
taken out of the picture. Come back to it whenever something breaks:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y github:metagai/metag-mcp
```

The first run opens a browser to sign in and stores the token at
`~/.metag/token` (mode 0600). You are not asked again. A healthy run prints one
line of JSON containing `"tools":[…]`.

## The first thing to ask for

> Quote a four-shot film about a cat learning to skateboard.

`quote_film`: about five seconds, **0 credits, nothing is created**. You get the
shot list it would shoot and what each tier costs. Then:

> Make it.

`make_film`: also **0 credits**. A watchable draft and a Studio link. Nobody is
charged until a person has seen it and said yes.

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
gateway and this package keeps no copy of it — when the server adds a tool, you
do not need to upgrade.

## Environment

| Variable | Effect |
|---|---|
| `METAG_TOKEN` | Supply a token directly and skip the browser sign-in. For CI |
| `METAG_BROWSER=0` | Never open a browser — neither at sign-in nor when a tool asks for a human. Tools still return links; nothing is lost |
| `METAG_API` | Gateway address, defaults to `https://api.metag.ai` |

## Billing

Drafts are free. Rendering is billed per shot; subscribers are not billed per
render on our own engine (fair-use limits apply). Failed generations are
refunded automatically. Prices at <https://metag.ai/#pricing> are
authoritative.

## Development

```bash
npm test
```

The suite drives the real binary over stdio against a stand-in gateway: the
server starts, tools list, a tool call returns a result, and a rejected token
produces one sentence rather than a stack trace and a five-minute hang. Two
checks reach the network and skip when offline — one asks the live gateway
whether an unauthenticated request is refused, the other asks whether the
package spec `install` writes actually resolves.

Changes that affect a running install are in [CHANGELOG.md](CHANGELOG.md).

## Source

This repository is published from the `mcp-bridge/` directory of the METAG
monorepo with `git subtree push`, so the two never drift.

## License

Commercial. See [LICENSE](LICENSE) and <https://metag.ai/terms-of-use.html>.
