# metag-mcp

把一句话变成一支片子，然后**交给人去剪**。

METAG 的 MCP 服务器。生成走我们自研的引擎（单镜约 3 秒画面，成本比调用同类
API 低一个数量级），剪辑走一个真实的时间线 —— 而这两件事之间是通的：
agent 生成的每一镜都记得自己是怎么来的，人在时间线上右键就能把某一镜重拍掉。

## 装

```bash
npx metag-mcp install
```

它只往当前项目写两样东西，别的一概不动：

- `.mcp.json` —— MCP 服务器条目（合并写入，你已有的其它服务器不会被吃掉）
- `.claude/skills/metag/SKILL.md` —— 什么时候用它，以及唯一那条规矩：
  **草案免费，先给人看过再扣钱**

重启 agent，然后跟它要一支片子。

<details>
<summary>手动装，或者客户端不认 <code>.mcp.json</code></summary>

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

想钉死版本：`npx -y metag-mcp@0.2.0`。

</details>

**不需要先去弄 API key。** 第一次调用时会弹浏览器登录，token 存在
`~/.metag/token`（0600），之后不再打扰你。

## 它给 agent 什么

| 工具 | 什么时候用 |
|---|---|
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
| `METAG_BROWSER=0` | 不弹浏览器。工具照样返回链接，能力不减 |
| `METAG_API` | 网关地址，默认 `https://api.metag.ai` |

## 计费

草案免费。出片按镜计费，订阅用户用自研引擎不按条计费（有公平使用上限）。
生成失败自动退还。价格以 <https://metag.ai/#pricing> 为准。

## 许可

商用许可见 <https://metag.ai/terms-of-use.html>。
