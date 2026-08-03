#!/usr/bin/env node
/**
 * METAG 的 MCP 桥：stdio ↔ 网关。
 *
 * ## 为什么需要它
 *
 * 网关本来就说 MCP（Streamable HTTP + JSON-RPC）。但要用上它，人得自己填一段
 * 配置、自己弄一个 JWT —— 这个摩擦足以劝退绝大多数人，而 agent 产品真正的
 * 分发路径是「一行装上」。**装不上的能力等于没有。**
 *
 * 所以这里只做两件网关做不了的事：
 *   1. 讲 stdio（agent 客户端启动子进程，不是访问 URL）
 *   2. 替人拿到并保管 token —— 没有就弹浏览器，拿到存本机，用户全程不碰 JWT
 *
 * 工具清单**不在这里维护**。桥启动时向网关要一次，原样转发。
 * 在这里抄一份，就等着它和服务端走散 —— 那正是今天在文档页上踩过的坑。
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
  // 文件已存在时 writeFileSync 的 mode 不生效，显式收一次权限：
  // 这是一枚长期凭证，不该是同机其他用户可读的
  chmodSync(TOKEN_FILE, 0o600);
}

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
}

/**
 * 弹浏览器登录，等回跳。
 *
 * token 由网关放在 URL 的 **fragment** 里 —— fragment 不会随请求发到服务器，
 * 所以本地这一页要用一段脚本把它读出来再回传。多这一跳是为了让 token
 * 不进任何访问日志。
 */
async function login() {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("登录超时")), 5 * 60_000);
    server.on("request", (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === "/token") {
        const token = url.searchParams.get("t");
        res.writeHead(204).end();
        clearTimeout(timer);
        server.close();
        token ? resolve(token) : reject(new Error("没有拿到 token"));
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(
        `<!doctype html><meta charset="utf-8"><title>METAG</title>
<body style="font:15px system-ui;padding:3rem;max-width:32rem;margin:auto">
<p id="m">正在完成登录…</p>
<script>
  var t = new URLSearchParams(location.hash.slice(1)).get("token");
  if (t) {
    fetch("/token?t=" + encodeURIComponent(t)).then(function () {
      document.getElementById("m").textContent = "已登录，可以关掉这个页面回到终端。";
    });
  } else {
    document.getElementById("m").textContent = "登录没有完成，请回终端重试。";
  }
</script>`,
      );
    });
  });

  const authUrl = `${API}/api/v1/auth/google/start?client=cli&port=${port}`;
  process.stderr.write(`\n需要先登录 METAG。浏览器打不开的话，手动访问：\n${authUrl}\n\n`);
  openBrowser(authUrl);
  const token = await done;
  saveToken(token);
  process.stderr.write("登录完成。\n");
  return token;
}

// ── 转发 ───────────────────────────────────────────────────────────────────

let token = readToken();
/**
 * 正在进行的登录。多条请求同时到达时不能各弹一个浏览器 ——
 * 实测两行输入就开了两个登录窗口、占了两个端口。
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
        // 网关按 Origin 判来源；CLI 没有浏览器 Origin，声明成自己
        origin: SITE,
      },
      body: JSON.stringify(body),
    });

  let res = await send();
  if (res.status === 401) {
    // token 过期就重新登录再试一次。让用户自己去删 ~/.metag/token 是最差的设计。
    token = await ensureLogin();
    res = await send();
  }
  if (!res.ok) throw new Error(`网关返回 ${res.status}`);
  return res.json();
}

/**
 * 工具说"该给人看了"就弹浏览器。
 *
 * 这是桥存在的第二个理由：**agent 没有屏幕，人有**。判断"这一步需要人的品味"
 * 是模型能做的，而把浏览器打开只有本机进程能做。
 *
 * 认返回值里的标记，不认工具名 —— 认工具名意味着服务端加一个工具就要改一次桥，
 * 而桥是装在别人机器上、更新最慢的那一环。
 */
function maybeOpenBrowser(out) {
  // 无头环境（CI、容器、远程 shell）里弹浏览器是骚扰而不是帮忙。
  // 默认开着，因为桌面用户占绝大多数；关掉之后工具照样返回链接，能力不减。
  if (process.env.METAG_BROWSER === "0") return;
  const text = out?.result?.content?.[0]?.text;
  if (typeof text !== "string") return;
  try {
    const payload = JSON.parse(text);
    if (payload?.open_in_browser && typeof payload.url === "string") {
      openBrowser(payload.url);
      process.stderr.write(`已在浏览器打开：${payload.url}\n`);
    }
  } catch {
    // 工具返回的不是 JSON，正常，忽略
  }
}

// ── stdio JSON-RPC ─────────────────────────────────────────────────────────

function write(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const rl = createInterface({ input: process.stdin });
/**
 * 还在飞的请求。stdin 关掉就直接退出会把它们一起杀掉 ——
 * 真实客户端一直开着 stdin 所以线上撞不到，但管道测试必然撞到，
 * 而一个测不了的东西等于没验过。
 */
const inFlight = new Set();

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return; // 半行/噪声：不该让整座桥塌掉
  }
  // 通知没有 id，按 JSON-RPC 约定不能回
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
