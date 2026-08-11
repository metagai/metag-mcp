# metag-mcp

**让你的编程 agent 会拍片 —— 然后把片子交给人去剪。**

METAG 的 MCP 服务器。agent 描述一支视频，METAG 出分镜、写旁白、配音、渲染每一
镜，回给你一条能编辑的时间线链接。生成走我们自研的引擎（单镜约 3 秒画面，成本
比调用同类 API 低一个数量级）。agent 生成的每一镜都记得自己是怎么来的，人在时
间线上右键就能把某一镜单独重拍。

适用于 **Claude Code、Codex CLI、Kimi Code、Cursor、Gemini CLI**。需要 Node 20+。
不需要先去弄 API key。

英文版（主）：[README.md](./README.md)

## 装

```bash
npx -y github:metagai/metag-mcp install
```

它只往当前项目写两样东西，别的一概不动：

- `.mcp.json` —— MCP 服务器条目（合并写入，你已有的其它服务器不会被吃掉）
- `.claude/skills/metag/SKILL.md` —— 什么时候用它，以及唯一那条规矩：
  **草案免费，先给人看过再扣钱**

重启 agent，然后跟它要一支片子。

你的 agent 不吃 `.mcp.json`？Codex 用的是 TOML，Kimi Code 是另一个路径，Gemini
又是一个 —— **[docs/setup.md](docs/setup.md) 按家给出确切的文件、格式和命令**，
另附一张「症状 → 怎么修」对照表。

### 验证它通了

这一条把 agent 摘出去，直接量整条链路：进程、登录、网络、网关。以后哪儿不对了
都先回来跑它：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y github:metagai/metag-mcp
```

第一次跑会弹浏览器登录，token 存在 `~/.metag/token`（0600），之后不再打扰你。
通了的话会打印一行含 `"tools":[…]` 的 JSON。

## 第一句该问什么

> 报个价：一支四镜的片子，猫学滑板。

`quote_film`：约 5 秒，**0 credits，什么都不生成**。返回它打算怎么拍、每一档
多少钱。然后：

> 拍吧。

`make_film`：同样 **0 credits**。给你一个能看的草案和一条 Studio 链接。人没看
过、没点头之前，不扣任何人的钱。

## 它给 agent 什么

| 工具 | 什么时候用 |
|---|---|
| `quote_film` | 用户要视频但还没定。**0 credits，什么都不生成** —— 5 秒内返回分镜与各档价格，先说清楚拍什么、多少钱 |
| `make_film` | 用户要一支片子。**0 credits** —— 先出草案给人看，别直接花人家的钱 |
| `open_in_studio` | 需要人的品味了（挑镜、调节奏、加自己的素材）。浏览器直接弹到那条时间线 |
| `reshoot_shot` | 用户说"第三镜不对"。**只重拍那一镜**，别重生成整条片子把人剪好的东西扔掉 |
| `list_takes` / `promote_take` | 看候选与质量分、定版。定版可逆，换下去的那条留着 |
| `get_recipe` | 取逐镜提示词与旁白。和 Studio 导出的是同一份文档，可交给人也可喂回去重建 |
| `generate_video` / `job_status` | 直接出片（**立即扣费**）与轮询 |
| `run_director` / `approve_run` | 要先给人看报价时走这条 |
| `edit_image` / `synthesize_speech` / `account_balance` | 改图、配音、查余额 |

完整参数见 <https://metag.ai/docs>。工具清单由服务端下发，这个包不维护副本 ——
所以服务端加了工具，你不用升级它。

## 环境变量

| 变量 | 作用 |
|---|---|
| `METAG_TOKEN` | 直接给 token，跳过浏览器登录（CI 用） |
| `METAG_BROWSER=0` | 一律不弹浏览器 —— 登录时也不弹。工具照样返回链接，能力不减 |
| `METAG_API` | 网关地址，默认 `https://api.metag.ai` |

## 计费

草案免费。出片按镜计费，订阅用户用自研引擎不按条计费（有公平使用上限）。
生成失败自动退还。价格以 <https://metag.ai/#pricing> 为准。

## 许可

商用许可见 [LICENSE](LICENSE) 与 <https://metag.ai/terms-of-use.html>。
