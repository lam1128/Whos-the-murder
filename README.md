# 大侦探互动剧情项目

一个可在本地运行的简体中文互动剧情游戏，使用 Next.js、TypeScript、React、Tailwind CSS、Zod 和场景状态机实现。

本仓库负责把已经完成创作与测试的定稿 Scenario JSON 实现为可游玩的网页。

## `README.md` 与 `AGENTS.md` 的区别

- `README.md` 面向人类，说明项目用途、文件结构、运行方式和开发入口。
- `AGENTS.md` 面向 Codex，是修改本项目时必须执行的最高开发规则。

开始使用项目时读 `README.md`；让 Codex 修改项目时，Codex 必须先读 `AGENTS.md`。

## 权威资料

项目不依赖写死的旧版文件名。工作时应扫描并选择数字版本最高的正式文件：

- `project_knowledge_v*.json`：全局世界、人物和项目事实。
- `game_host_rules_v*.json`：主持、交互和输出规则。
- `<剧情前缀>_v<版本号>.json`：具体 Scenario。

`Scenario` 是具体剧情、章节、主线、支线或 Demo JSON 的统称，并不是文件名中必须出现的固定单词。例如：

- `first_acquaintance_v1.1.0.json`
- `old_sluice_v2.4.1.json`

同一剧情只比较相同前缀下的数字版本。版本按整数段依次比较，缺省段按 `0` 处理，因此 `v2.5` 高于 `v2.4.99`。

完整优先级、命名和修改规则见 [`AGENTS.md`](./AGENTS.md)。

## 当前实现

项目目前包含多个版本化剧情数据及其网页实现，包括：

- 旧水闸
- 初识章节
- 角色创建
- 场景选项与自由输入
- 游戏状态、线索、物品及人物信息展示
- 浏览器本地存档、读取与重新开始
- Zod 数据校验和自动化测试
- 临时访问令牌保护

README 不记录详细剧情内容或尚未定稿的剧情计划；具体内容以相应剧情前缀的最新版 Scenario JSON 为准。

## Scenario 实现原则

- 旧水闸的现有 UI 是所有 Scenario 的固定基准。
- 新 Scenario 默认只更换剧情文本和数据，继续复用相同布局、组件、样式与交互。
- 推荐使用共享 UI 和数据驱动加载，不为每个 Scenario 维护互相分叉的界面副本。
- 所有 Scenario 共用同一个网页应用和统一入口，例如 `http://localhost:3000`。
- 端口可能因运行环境变成 `3001`、`3002` 等，但不同 Scenario 不需要独立网站或独立网址。
- 网站提供统一的 Scenario 选择界面，玩家从中选择想玩的剧情。
- 每个剧情前缀只提供数字版本最高的正式 Scenario，不展示或选择历史版本。
- 上传同一 Scenario 的新版本后，网页中的对应内容更新到最新版；其他 Scenario 保持不变。

实际实现必须遵守 [`AGENTS.md`](./AGENTS.md) 中的 UI 锁定、单一网页、最新版选择和验证规则。

## 本地运行

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`。

运行测试与生产构建：

```bash
npm test
npm run build
```

项目脚本会在开发、测试、构建和启动前，自动同步各剧情前缀的最新版运行时数据。目前会同步：

- `generation/事件2_初识/first_acquaintance_v*.json` -> `data/first_acquaintance_current.json`
- `generation/事件1_旧水闸/old_sluice_v*.json` -> `data/old_sluice_current.json`

## 主要目录

```text
components/   游戏界面组件
generation/   按事件整理的生成资料、版本化 Scenario 与全局设定
data/         仅保留运行时自动同步数据
lib/          类型、数据适配、展示逻辑和游戏引擎
pages/        页面与路由
scripts/      数据选择和项目辅助脚本
styles/       全局样式
tests/        数据、状态和交互测试
```

根目录中的主要说明文件：

```text
AGENTS.md                   Codex 的最高开发规则
README.md                   项目介绍与运行说明
CONTENT_FREEZE.md           已封存内容的修改限制
GENERATION_QUALITY_GUIDE.md 既有质量流程与历史记录
```

## 临时分享

可先运行生产构建：

```bash
npm run build
npm start
```

再自行安装 `cloudflared`，然后使用 Cloudflare Tunnel 暴露本地服务：

```powershell
cloudflared tunnel --url http://localhost:3000
```

`cloudflared` 可从 Cloudflare 官方发布页下载安装；本仓库不再附带该可执行文件。

项目支持通过环境变量 `ALLOWED_TOKENS` 配置最多三组以英文逗号分隔的访问令牌：

```powershell
$env:ALLOWED_TOKENS = 'token-one,token-two,token-three'
```

临时地址和令牌只应发送给预期的测试者。

## 开发原则

- Codex 接收的是已定稿 Scenario JSON，不默认承担剧情创作或测试记录工作。
- 不得擅自改写未被用户点名的剧情、对白、选项或全局设定。
- 最终 Scenario 的玩家选项统一使用 `1`、`2`、`3`、`4`。
- 修改后应运行与改动相称的自动化测试和生产构建。
- 具体约束始终以根目录 [`AGENTS.md`](./AGENTS.md) 为准。
