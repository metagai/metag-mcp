/**
 * What this suite is for.
 *
 * The bridge is the only piece of METAG installed on other people's machines,
 * which makes it the slowest thing we can ever fix. So the questions here are
 * the ones a stranger's first five minutes ask, and every one of them is a
 * question about behaviour:
 *
 *   - does the server come up and answer `initialize`?
 *   - does a tool list come back?
 *   - does calling a tool actually return a result?
 *   - when auth fails, does the user get one sentence, or a stack trace and a
 *     five-minute hang?
 *
 * None of these assert on the source text of the bridge. Each one drives the
 * real binary over stdio against an HTTP server that speaks the gateway's half.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeGateway, startBridge, BIN } from "./helpers.mjs";

test("initialize round-trips: the server comes up and identifies itself", async () => {
  const gw = await fakeGateway();
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    const res = await b.call({ method: "initialize", params: {} });
    assert.equal(res.jsonrpc, "2.0");
    assert.equal(res.result.serverInfo.name, "metag");
    assert.ok(res.result.capabilities.tools, "must advertise tool capability");
  } finally {
    b.stop();
    await gw.close();
  }
});

test("tools/list returns a non-empty list of named tools", async () => {
  const gw = await fakeGateway();
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    const res = await b.call({ method: "tools/list" });
    const tools = res.result.tools;
    assert.ok(Array.isArray(tools) && tools.length > 0, "tool list must not be empty");
    for (const t of tools) {
      assert.ok(typeof t.name === "string" && t.name.length, "every tool needs a name");
      assert.ok(typeof t.description === "string" && t.description.length, `${t.name} needs a description`);
    }
  } finally {
    b.stop();
    await gw.close();
  }
});

test("calling a tool returns a real result, and the bearer token reaches the gateway", async () => {
  const gw = await fakeGateway();
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    const res = await b.call({
      method: "tools/call",
      params: { name: "account_balance", arguments: {} },
    });
    assert.equal(res.result.isError, false);
    const payload = JSON.parse(res.result.content[0].text);
    assert.equal(payload.credits, 42);
    // The gateway keys on Origin and on the bearer; a bridge that dropped
    // either would still "work" against a permissive mock but 401 in production.
    const call = gw.calls.at(-1);
    assert.equal(call.auth, "Bearer test-token");
    assert.ok(call.origin, "the bridge must declare an Origin — the gateway keys on it");
  } finally {
    b.stop();
    await gw.close();
  }
});

test("a rejected METAG_TOKEN yields one readable sentence — no browser, no hang", async () => {
  // Someone in CI sets METAG_TOKEN, it is expired. The wrong answer here is
  // to open a browser on a machine with no screen and block for five minutes;
  // the answer that costs us nothing is a sentence naming the variable.
  const gw = await fakeGateway({ token: "the-right-one" });
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "the-wrong-one" });
  try {
    const res = await b.call({ method: "tools/list" }, 6000);
    assert.ok(res.error, "a rejected token must surface as a JSON-RPC error");
    const msg = res.error.message;
    assert.ok(/METAG_TOKEN/.test(msg), `message must name the variable at fault, got: ${msg}`);
    assert.ok(/401|rejected/i.test(msg), `message must say it was rejected, got: ${msg}`);
    assert.ok(!/\bat \w+ \(|\.mjs:\d+/.test(msg), `message must not be a stack trace, got: ${msg}`);
    assert.ok(msg.length < 300, "one sentence, not a dump");
    assert.equal(b.browserOpened(), false, "must not open a browser when a token was supplied");
  } finally {
    b.stop();
    await gw.close();
  }
});

test("no token at all under METAG_BROWSER=0 explains itself instead of opening a browser", async () => {
  // METAG_BROWSER=0 is documented as "never open a browser". Sign-in used to
  // ignore it, so the one flag a headless user could reach did not cover the
  // one moment they needed it to.
  const gw = await fakeGateway({ token: "unreachable" });
  const b = startBridge({ METAG_API: gw.url, METAG_BROWSER: "0" });
  try {
    const res = await b.call({ method: "tools/list" }, 6000);
    assert.ok(res.error, "an unauthenticated headless run must return an error");
    assert.ok(/METAG_BROWSER|METAG_TOKEN/.test(res.error.message), res.error.message);
    assert.equal(b.browserOpened(), false, "METAG_BROWSER=0 means no browser, including at sign-in");
  } finally {
    b.stop();
    await gw.close();
  }
});

test("an unreachable gateway names the address instead of leaking a fetch error", async () => {
  // Wrong region, VPN off, gateway down: all of these land here, and
  // "fetch failed" tells the user nothing about which address to check.
  // Bind a port, then let it go: a port nothing listens on, guaranteed. A
  // hard-coded low port is not equivalent — port 9 is on Node's blocked list
  // and fails as "bad port" before any connection is attempted, so the test
  // would pass while proving nothing about a refused connection.
  const dead = await fakeGateway();
  const url = dead.url;
  await dead.close();

  const b = startBridge({ METAG_API: url, METAG_TOKEN: "t" });
  try {
    const res = await b.call({ method: "tools/list" }, 8000);
    assert.ok(res.error, "an unreachable gateway must produce an error reply");
    assert.ok(res.error.message.includes(url), `must name the address, got: ${res.error.message}`);
    // Naming the address is not enough — the errno is what separates "nothing
    // is listening there" from "no network at all".
    assert.match(res.error.message, /\(ECONNREFUSED\)/, "must name the errno, not just say fetch failed");
  } finally {
    b.stop();
  }

  // A METAG_API that fetch refuses to even attempt has no errno at all. This
  // is the shape a typo'd address takes, and it used to print `fetch failed`.
  const typo = startBridge({ METAG_API: "http://127.0.0.1:9", METAG_TOKEN: "t" });
  try {
    const res = await typo.call({ method: "tools/list" }, 8000);
    assert.ok(res.error, "a malformed gateway address must produce an error reply");
    assert.ok(
      !/fetch failed/.test(res.error.message),
      `a typo'd address must be explained, got: ${res.error.message}`,
    );
  } finally {
    typo.stop();
  }
});

test("rate limiting is reported as a wait, not as a bare status code", async () => {
  const gw = await fakeGateway({ handler: () => ({ status: 429, body: {} }) });
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    const res = await b.call({ method: "tools/list" }, 6000);
    assert.ok(res.error, "429 must surface as an error");
    assert.match(res.error.message, /too many|wait|slow/i);
  } finally {
    b.stop();
    await gw.close();
  }
});

test("garbage on stdin does not kill the bridge", async () => {
  // Clients do send partial lines and stray output. A bridge that dies on one
  // takes the whole agent session with it.
  const gw = await fakeGateway();
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    b.raw("this is not json");
    b.raw("");
    const res = await b.call({ method: "initialize", params: {} });
    assert.equal(res.result.serverInfo.name, "metag");
  } finally {
    b.stop();
    await gw.close();
  }
});

test("notifications get no reply, and do not stall the next request", async () => {
  const gw = await fakeGateway();
  const b = startBridge({ METAG_API: gw.url, METAG_TOKEN: "test-token" });
  try {
    b.raw(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
    const res = await b.call({ method: "tools/list" });
    assert.ok(res.result.tools.length > 0);
    assert.ok(
      gw.calls.some((c) => c.rpc.method === "notifications/initialized"),
      "the notification must still be forwarded",
    );
  } finally {
    b.stop();
    await gw.close();
  }
});

test("`install` writes a usable .mcp.json and keeps the servers already there", async () => {
  // This is the whole first-run experience. Eating a project's other MCP
  // servers would be a worse bug than not installing at all.
  const dir = mkdtempSync(join(tmpdir(), "metag-install-"));
  writeFileSync(
    join(dir, ".mcp.json"),
    JSON.stringify({ mcpServers: { other: { command: "other-server" } } }, null, 2),
  );
  execFileSync(process.execPath, [BIN, "install"], { cwd: dir, stdio: "pipe" });

  const cfg = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"));
  assert.equal(cfg.mcpServers.other.command, "other-server", "an existing server must survive install");
  assert.equal(cfg.mcpServers.metag.command, "npx");
  assert.equal(cfg.mcpServers.metag.args[0], "-y");
  assert.ok(cfg.mcpServers.metag.args[1], "install must write a package spec to launch");
  assert.ok(existsSync(join(dir, ".claude", "skills", "metag", "SKILL.md")));
});

/**
 * The one that would have caught the shipped-but-unpublished bug.
 *
 * `install` used to write `npx -y metag-mcp`, and `metag-mcp` does not exist on
 * npm. Every assertion about that file passed; the file simply could not start.
 * Whether a package spec resolves is not knowable from our source — it has to
 * be asked of the registry or of GitHub, which is what this does.
 */
test("live: the package spec `install` writes actually resolves", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "metag-spec-"));
  execFileSync(process.execPath, [BIN, "install"], { cwd: dir, stdio: "pipe" });
  const spec = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8")).mcpServers.metag.args[1];

  const probe = spec.startsWith("github:")
    ? ["git", ["ls-remote", `https://github.com/${spec.slice("github:".length)}`, "HEAD"]]
    : ["npm", ["view", spec, "version"]];
  try {
    // No pipe: the exit code has to be this command's own.
    const out = execFileSync(probe[0], probe[1], { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
    assert.ok(String(out).trim().length > 0, `${spec} resolved to nothing`);
  } catch (err) {
    if (/ENOTFOUND|ETIMEDOUT|network|getaddrinfo/i.test(String(err.stderr ?? err.message))) {
      t.skip("offline — cannot check whether the install spec resolves");
      return;
    }
    assert.fail(
      `install writes \`npx -y ${spec}\`, but that spec does not resolve. ` +
        `Anyone following the README gets a config that cannot start. (${String(err.stderr ?? err.message).trim().split("\n")[0]})`,
    );
  }
});

test("`install` refuses to touch a .mcp.json it could not parse", async () => {
  const dir = mkdtempSync(join(tmpdir(), "metag-install-bad-"));
  const p = join(dir, ".mcp.json");
  writeFileSync(p, "{ this is not json");
  let code = 0;
  try {
    execFileSync(process.execPath, [BIN, "install"], { cwd: dir, stdio: "pipe" });
  } catch (e) {
    code = e.status;
  }
  assert.notEqual(code, 0, "must exit non-zero rather than silently replacing the file");
  assert.equal(readFileSync(p, "utf8"), "{ this is not json", "the unreadable file must be left alone");
});

/**
 * The live gateway, with no credentials.
 *
 * Everything above runs against a server we wrote, which means it can only
 * prove the bridge is self-consistent. This one asks the real deployment
 * whether an unauthenticated MCP request is refused — the single security
 * property a stranger's misconfiguration depends on. Skipped when offline,
 * because a red build on a plane teaches people to ignore red builds.
 */
test("live: the real gateway refuses an unauthenticated MCP request", async (t) => {
  const api = process.env.METAG_API ?? "https://api.metag.ai";
  let res;
  try {
    res = await fetch(`${api}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    t.skip(`${api} unreachable — skipping the live check`);
    return;
  }
  assert.equal(res.status, 401, "an unauthenticated tools/list must be refused");
  const body = await res.text();
  assert.ok(!/quote_film|make_film/.test(body), "a refusal must not leak the tool list");
});
