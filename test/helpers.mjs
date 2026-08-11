/**
 * Test harness for the METAG MCP bridge.
 *
 * Everything here exists so the assertions can be about **behaviour** rather
 * than about the text of `bin/metag-mcp.mjs`. Two pieces make that possible:
 *
 *   fakeGateway()  a real HTTP server that speaks the gateway's half of MCP,
 *                  so the bridge can be driven end to end with no credentials
 *                  and no network
 *   startBridge()  spawns the real binary as a child process and talks to it
 *                  over stdio, exactly the way an agent client does
 *
 * `startBridge` also puts a **stub browser opener** first on PATH. Opening a
 * browser is the one side effect a headless test can neither see nor survive,
 * and the bridge is supposed to never do it in CI — the stub turns "did it
 * open a browser?" into a file that either exists or does not.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

export const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "metag-mcp.mjs");

/** Spin up an HTTP server that answers /mcp the way the real gateway does. */
export async function fakeGateway({ token = "test-token", handler } = {}) {
  const calls = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const rpc = body ? JSON.parse(body) : {};
      calls.push({ rpc, auth: req.headers.authorization, origin: req.headers.origin });

      // 401 is the branch that matters most: it is what an expired or bogus
      // token looks like, and the bridge's response to it is the difference
      // between a readable sentence and a five-minute hang.
      if (token !== null && req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401).end();
        return;
      }
      const custom = handler?.(rpc);
      if (custom) {
        res.writeHead(custom.status ?? 200, { "content-type": "application/json" });
        res.end(JSON.stringify(custom.body ?? {}));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: defaultResult(rpc) }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    calls,
    close: () => new Promise((r) => server.close(r)),
  };
}

function defaultResult(rpc) {
  switch (rpc.method) {
    case "initialize":
      return {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "metag", version: "0.0.0-test" },
      };
    case "tools/list":
      return {
        tools: [
          { name: "quote_film", description: "Price a film. 0 credits.", inputSchema: { type: "object" } },
          { name: "account_balance", description: "Credits on hand.", inputSchema: { type: "object" } },
        ],
      };
    case "tools/call":
      if (rpc.params?.name === "account_balance") {
        return {
          content: [{ type: "text", text: JSON.stringify({ credits: 42, subscribed: false }) }],
          isError: false,
        };
      }
      return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
    default:
      return {};
  }
}

/**
 * Spawn the bridge and return a `call(rpc)` that resolves with its reply.
 *
 * The stub opener is a shell script named for whatever this platform uses to
 * open a URL; it records the fact it ran into `openedMarker`. A test can then
 * assert a browser was *not* launched, which is the only way to tell a working
 * headless path from one that merely has not blocked yet.
 */
export function startBridge(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "metag-mcp-test-"));
  const openedMarker = join(dir, "browser-opened");
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const stub = join(dir, opener);
  writeFileSync(stub, `#!/bin/sh\necho "$@" > ${JSON.stringify(openedMarker)}\n`);
  chmodSync(stub, 0o755);

  const childEnv = {
    ...process.env,
    PATH: `${dir}:${process.env.PATH}`,
    HOME: dir, // never touch the developer's real ~/.metag/token
    ...env,
  };
  // A METAG_TOKEN inherited from the developer's shell would silently change
  // what every test exercises, and the auth tests would pass for the wrong
  // reason. Only a token a test asked for gets through.
  if (!("METAG_TOKEN" in env)) delete childEnv.METAG_TOKEN;

  const child = spawn(process.execPath, [BIN], { env: childEnv, stdio: ["pipe", "pipe", "pipe"] });

  const pending = new Map();
  const stderr = [];
  child.stderr.on("data", (c) => stderr.push(String(c)));
  createInterface({ input: child.stdout }).on("line", (line) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });

  let nextId = 1;
  return {
    dir,
    stderr,
    browserOpened: () => existsSync(openedMarker),
    /** Send one JSON-RPC request; reject if no reply arrives in `timeoutMs`. */
    call(rpc, timeoutMs = 8000) {
      const id = rpc.id ?? nextId++;
      const withId = { jsonrpc: "2.0", id, ...rpc };
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`no reply to ${rpc.method} within ${timeoutMs}ms`)),
          timeoutMs,
        );
        pending.set(id, (msg) => {
          clearTimeout(timer);
          resolve(msg);
        });
        child.stdin.write(JSON.stringify(withId) + "\n");
      });
    },
    /** Send a raw line (used for notifications and for deliberate garbage). */
    raw(line) {
      child.stdin.write(line + "\n");
    },
    stop() {
      child.stdin.end();
      child.kill();
    },
  };
}
