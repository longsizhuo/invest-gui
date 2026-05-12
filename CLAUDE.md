# CLAUDE.md — invest-gui 项目级指引

> 这份文件给 Claude（或任何 AI agent）改 invest-gui 代码时看。
> 核心准则：**文档 ↔ GUI ↔ Wiki 三方对齐**。改一处必同步另两处。

## 三方对齐铁律（这一节是本文件唯一不可妥协的部分）

**改任何 user-facing 行为，必须同时改 3 处**：

| 改什么 | 改这里 (1) | 改这里 (2) | 改这里 (3) |
|---|---|---|---|
| 新增 / 改顶层路由（如 /settings）| `src/main.tsx` + `src/App.tsx` 导航 | 后端 `skills/invest/SKILL.md` 子命令表 + 触发场景 | `docs/wiki/` 对应章节（后端仓库内） |
| 新增 / 改后端 API 端点 | `src/lib/swr-keys.ts` 加常量 + JSDoc | 后端 `connectors/web_api.py` 加端点 + Pydantic schema | 后端 `skills/invest/SKILL.md` 的 Web API 端点表（agent 也要会调） |
| 改 user-facing 字段（如 wealth_context 新增子字段）| GUI 表单 + SWR_KEYS JSDoc | 后端 `core/schemas.py` UserData + WealthContextOfficer prompt | 后端 `docs/wiki/12-verification.md` 主张段更新（如属于"实测主张"层级）|
| 改 API 返回结构 | `pnpm gen-types` 重新生成 `api-types.ts` | 后端调整 response_model | — |
| 加新 verdict 角色 / 字段 | `parseCommitteeMd.ts` + `CommitteeRolesPanel.tsx` + `HistoryTab.tsx` parse | 后端 `agents/skills/<role>/SKILL.md` + `core/committee.py:_persist` 落盘 | 后端 wiki `02-agents.md` |

**忘了对齐 = bug**。例：2026-05-12 后端加 wealth_context 字段没同步 GUI，导致用户填不了 → WealthContextOfficer 永远跑空数据。同理任何只改一处的"半完工"都是技术债。

## 核心产品哲学（跟后端 CLAUDE.md 互补）

invest-gui 在 openInvest 三层架构中扮演**展示层**：

| 层 | 服务对象 | 在 invest-gui 视角 |
|----|---------|------|
| **GUI**（本仓库） | 小白用户 | 你正在改的代码 |
| **CLI / Skill** | AI agent | 你**不要替代**（agent 走 CLI 不走 GUI）|
| **Web API** | 共享底层 | 你**只消费**（走 `src/lib/swr-keys.ts`）|

### 不做（产品边界）

- ❌ **不要在 GUI 加"agent 写操作的二次入口"**——CLI 已有 deposit/buy/sell/withdraw 等 5 个写命令，GUI 已有等价 CashDialog/HoldingDialog/GoldTradeDialog。不要重复造第三套。
- ❌ **不要在 GUI 暴露 NapCat / QQ 推送相关字眼**（NapCat 是作者私用后门，前端不公开）。
- ❌ **不要在 GUI 教 fork 用户怎么部署**（Caddy / Cloudflare Access / systemd 配置归用户自己的责任，文档不教）。
- ❌ **不要 vibe coding 重复 CLI 已 cover 的功能**——加新东西前先看后端 SKILL.md，有等价 CLI 命令就不要复刻成 GUI 控件（除非用户场景需要可视化）。
- ❌ **不要直接 fetch /api/...**——所有 API URL 必须走 `SWR_KEYS`，杜绝硬编码字符串导致前后端 path 飘移。

### 必做

- ✅ **任何 user 可见的功能都在 wiki 有对应章节**：用户问"为什么这里这样"，能从 wiki 找到。改了 GUI 行为，wiki 同步更新（wiki 在后端仓库 `docs/wiki/`）。
- ✅ **后端 schema 字段名 = 前端 type / 表单 label**——别玩"前端叫 budget 后端叫 emergency_buffer"的把戏。
- ✅ **agentskills.io 开放标准**——SKILL.md 是给 Claude Code / Cursor / OpenClaw / Hermes 等所有 agent 看的，**GUI 改动如影响 agent 行为**（如 API 重命名），同步改后端 SKILL.md。

## 后端代码在哪

后端仓库：`longsizhuo/openInvest`。本机生产部署：`/home/ubuntu/projects-review/invest/`。

- API 实现：`connectors/web_api.py`
- Skill 协议（agent 看的）：`skills/invest/SKILL.md`
- Wiki：`docs/wiki/`（**改 GUI 行为后同步这里**）

GUI 改动需要后端配合时，**两个仓库的 commit 应该在同一段时间内推上去**——不然 GUI ship 了但 API 没暴露，用户看到 `Unexpected token '<', "<!doctype "...` 这种错。

## 关键文件速查

```
src/main.tsx              路由注册（lazy load 所有 page）
src/App.tsx               顶层 PRIMARY_NAV / SECONDARY_NAV
src/lib/swr-keys.ts       后端 API 路径常量（单一可信源）
src/lib/api-client.ts     fetcher + putJSON + postJSON 等通用 helper
src/lib/parseCommitteeMd.ts  解析 committee markdown 段落 + 提取角色 SIGNAL/STRENGTH/ONE_LINER
src/components/CommitteeRolesPanel.tsx   4 角色独立卡片
src/components/DashboardHero.tsx  顶部总资产 + wealth_context chips
src/routes/Settings.tsx   wealth_context 表单（唯一 GUI-only 数据入口）
src/routes/committee/    委员会相关 7 个 sub-tab
```

## 测试纪律

- **`pnpm tsc --noEmit`** 改完必跑（CI 也跑）
- **`pnpm build`** 改完必跑（确保 prod build 不破）
- 不要靠"在 dev server 看着没事"，CI 用 prod build 验证
- `.github/workflows/release-dist.yml` 自动 release 到 `dist-latest` tag，
  生产服务器 `invest-gui-sync.timer` 每 30 分钟自动 sync 到 `/srv/invest-gui/`

## SWR_KEYS 是单一可信源

**严禁** `useSWR("/api/foo")` 这种硬编码。所有路径走 `SWR_KEYS.FOO`：

```typescript
// 错
const { data } = useSWR<UserProfile>("/api/user", fetcher);

// 对
import { SWR_KEYS } from "../lib/swr-keys";
const { data } = useSWR<UserProfile>(SWR_KEYS.USER, fetcher);
```

后端拆分或重命名路由时，**只改 SWR_KEYS 一个文件**，所有 useSWR / mutate 自动跟上。

## 隐私 / privacy

某些金额视图要支持 privacy 模式（脱敏成 `¥●●●`）。检查 `usePrivacy()` hook：

```typescript
import { usePrivacy } from "../lib/privacy";
const { enabled: privacyOn } = usePrivacy();
return privacyOn ? "¥●●●" : `¥${amount.toLocaleString()}`;
```

新加金额展示组件时**记得套这层**，避免用户开了 privacy 但你的组件没遵守。

## 卡死了看哪

- TypeScript 报错 → 看 `src/lib/api-types.ts` 是不是过时（跑 `pnpm gen-types`）
- 加载 user profile 失败 `Unexpected token '<'` → 后端 `/api/user` 端点没 deploy（API 返了 SPA fallback HTML），重启后端
- /settings 页空白 → 后端 invest-web 服务没 restart 装新代码
- GUI 看到的还是旧版 → `/srv/invest-gui/` 没 sync 到最新 dist-latest，跑 `sudo systemctl start invest-gui-sync.service`
