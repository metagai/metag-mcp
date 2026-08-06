#!/usr/bin/env node
/**
 * METAG's MCP bridge: stdio <-> gateway.
 *
 * ## Why this exists
 *
 * The gateway already speaks MCP (Streamable HTTP + JSON-RPC). But using it
 * means hand-writing a config block and minting a JWT yourself — friction
 * that loses almost everyone, while the real distribution path for an agent
 * product is "install it in one line". **A capability nobody can install is
 * a capability nobody has.**
 *
 * So this bridge does only the two things the gateway cannot:
 *   1. Speak stdio (agent clients spawn a child process, they do not fetch a URL)
 *   2. Obtain and keep the token — open a browser when there is none, store it
 *      locally, and never make the user handle a JWT
 *
 * **The tool list is not maintained here.** The bridge asks the gateway once
 * at start-up and forwards it verbatim. Keeping a copy here guarantees it
 * drifts from the server — exactly the trap the docs page fell into.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const API = process.env.METAG_API ?? "https://api.metag.ai";
const SITE = process.env.METAG_SITE ?? "https://metag.ai";
const TOKEN_FILE = join(homedir(), ".metag", "token");

// ── token ──────────────────────────────────────────────────────────────────

function readToken() {
  if (process.env.METAG_TOKEN) return process.env.METAG_TOKEN;
  try {
    return readFileSync(TOKEN_FILE, "utf8").trim() || null;
  } catch {
    return null;
  }
}

function saveToken(token) {
  mkdirSync(dirname(TOKEN_FILE), { recursive: true, mode: 0o700 });
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  // writeFileSync's mode is ignored when the file already exists, so tighten
  // permissions explicitly: this is a long-lived credential and must not be
  // readable by other users on the machine
  chmodSync(TOKEN_FILE, 0o600);
}

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
}

/**
 * Open a browser to sign in and wait for the redirect.
 *
 * The gateway returns the token in the URL **fragment** — a fragment is never
 * sent to a server, so this local page reads it with a small script and posts
 * it back. The extra hop exists so the token never lands in an access log.
 */
async function login() {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Sign-in timed out")), 5 * 60_000);
    server.on("request", (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === "/token") {
        const token = url.searchParams.get("t");
        res.writeHead(204).end();
        clearTimeout(timer);
        server.close();
        token ? resolve(token) : reject(new Error("No token was returned"));
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(
        `<!doctype html><meta charset="utf-8"><title>METAG</title>
<body style="font:15px system-ui;padding:3rem;max-width:32rem;margin:auto">
<p id="m">Finishing sign-in…</p>
<script>
  var t = new URLSearchParams(location.hash.slice(1)).get("token");
  if (t) {
    fetch("/token?t=" + encodeURIComponent(t)).then(function () {
      document.getElementById("m").textContent = "Signed in. You can close this page and return to the terminal.";
    });
  } else {
    document.getElementById("m").textContent = "Sign-in did not complete. Return to the terminal and try again.";
  }
</script>`,
      );
    });
  });

  const authUrl = `${API}/api/v1/auth/google/start?client=cli&port=${port}`;
  process.stderr.write(`\nSign in to METAG first. If the browser did not open, visit:\n${authUrl}\n\n`);
  openBrowser(authUrl);
  const token = await done;
  saveToken(token);
  process.stderr.write("Signed in.\n");
  return token;
}

// ── Forwarding ─────────────────────────────────────────────────────────────

let token = readToken();
/**
 * The in-flight sign-in. Concurrent requests must not each open a browser —
 * two lines of input were measured to open two sign-in windows on two ports.
 */
let pendingLogin = null;

function ensureLogin() {
  pendingLogin ??= login().finally(() => {
    pendingLogin = null;
  });
  return pendingLogin;
}

async function callGateway(body) {
  if (!token) token = await ensureLogin();
  const send = () =>
    fetch(`${API}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        // The gateway keys on Origin; a CLI has no browser Origin, so declare our own
        origin: SITE,
      },
      body: JSON.stringify(body),
    });

  let res = await send();
  if (res.status === 401) {
    // An expired token re-authenticates and retries once. Telling the user to
    // delete ~/.metag/token themselves would be the worst possible design.
    token = await ensureLogin();
    res = await send();
  }
  if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
  return res.json();
}

/**
 * Open a browser when a tool says "a human should look at this now".
 *
 * This is the bridge's second reason to exist: **the agent has no screen, the
 * person does.** Deciding that a step needs human taste is something the model
 * can do; opening a browser is something only a local process can do.
 *
 * We key on a marker in the response, never on the tool name — keying on names
 * would mean every new server-side tool requires a bridge update, and the
 * bridge is the slowest-updating link, installed on other people's machines.
 */
function maybeOpenBrowser(out) {
  // In headless environments (CI, containers, remote shells) opening a browser
  // is harassment, not help. On by default because desktop users dominate;
  // when off, tools still return links and nothing is lost.
  if (process.env.METAG_BROWSER === "0") return;
  const text = out?.result?.content?.[0]?.text;
  if (typeof text !== "string") return;
  try {
    const payload = JSON.parse(text);
    if (payload?.open_in_browser && typeof payload.url === "string") {
      openBrowser(payload.url);
      process.stderr.write(`Opened in your browser: ${payload.url}\n`);
    }
  } catch {
    // The tool returned something that is not JSON — normal, ignore
  }
}

// ── stdio JSON-RPC ─────────────────────────────────────────────────────────

function write(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const rl = createInterface({ input: process.stdin });
/**
 * Requests still in flight. Exiting the moment stdin closes would kill them —
 * real clients hold stdin open so production never hits it, but a piped test
 * always does, and something that cannot be tested has not been verified.
 */
const inFlight = new Set();

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return; // Partial line or noise: must not bring the whole bridge down
  }
  // Notifications carry no id; per JSON-RPC they must not be answered
  const isNotification = req.id === undefined || req.id === null;
  const work = (async () => {
    const out = await callGateway(req);
    maybeOpenBrowser(out);
    if (!isNotification) write(out);
  })();
  inFlight.add(work);
  try {
    await work;
  } catch (err) {
    if (isNotification) return;
    write({
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32000, message: String(err?.message ?? err) },
    });
  } finally {
    inFlight.delete(work);
  }
});

rl.on("close", async () => {
  await Promise.allSettled([...inFlight]);
  process.exit(0);
});
