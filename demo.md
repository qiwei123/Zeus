# Windows 混合 RPA 机器人工具架构设计说明书 (TS/Electron 版)

本项目旨在构建一个基于 TypeScript 的 Windows 自动化客户端，能够同时无缝操控**浏览器（Web）**与**Windows 桌面客户端（Desktop）**，并提供可视化的 GUI 操作界面。

---

## 1. 项目整体技术栈选型

| 层级 | 技术选型 | 用途 |
|------|----------|------|
| **GUI 外壳与运行时** | Electron 28 + TypeScript 5.3 | 跨平台桌面应用容器 |
| **前端展示层** | React 18 + TailwindCSS + shadcn/ui | 可视化操作界面 |
| **构建工具** | Vite (renderer) + tsc (electron) | 前后端分别构建 |
| **浏览器自动化引擎** | Playwright 1.40 | 操控 Chromium/Firefox/WebKit |
| **桌面自动化引擎** | `@nut-tree/nut-js` 3.x | 图像识别 + 键鼠模拟 |
| **深度 UIA 解析** | `edge-js` (Edge.js) | 通过 C# 调用 Windows UIA 控件树 |
| **本地持久化** | `better-sqlite3` + TypeORM 0.3 | 任务流与执行记录存储 |
| **包管理 / Monorepo** | npm workspaces | apps/ 下三个子包 |

---

## 2. 目录结构设计 (Project Directory Structure)

### 2.1 完整结构（✅ 已实现 · 🚧 待实现）

```text
├── package.json                          # Monorepo 根配置 (workspaces: apps/*)
├── demo.md                               # 本文档
│
├── apps/
│   ├── electron/                         # ✅ Electron 主进程 (Main Process)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts                   # ✅ 应用入口 - 窗口创建 / DB 初始化 / IPC 注册
│   │       ├── preload.ts                # ✅ 预加载脚本 - 安全 IPC 桥接
│   │       ├── ipc/
│   │       │   └── handler.ts            # ✅ IPC 处理器 - 任务 CRUD / 执行控制
│   │       ├── db/
│   │       │   ├── database.ts           # ✅ SQLite 数据库初始化与连接管理
│   │       │   └── entities/
│   │       │       ├── TaskFlow.ts       # ✅ 任务流实体
│   │       │       └── ExecutionRecord.ts# ✅ 执行记录实体
│   │       └── engine/                   # 🚧 自动化核心引擎 (待实现)
│   │           ├── executor.ts           # 🚧 任务流执行器 (状态机)
│   │           ├── browser/              # 🚧 Playwright 封装
│   │           │   └── index.ts
│   │           └── desktop/              # 🚧 UIA / 键鼠控制封装
│   │               └── index.ts
│   │
│   ├── renderer/                         # 🚧 Electron 渲染进程 (Frontend GUI)
│   │   ├── package.json
│   │   ├── vite.config.ts                # 🚧 Vite 配置
│   │   └── src/
│   │       ├── main.tsx                  # 🚧 React 入口
│   │       ├── App.tsx                   # 🚧 根组件
│   │       ├── components/               # 🚧 UI 组件 (任务卡片、日志流)
│   │       ├── pages/                    # 🚧 仪表盘、任务编排页
│   │       └── hooks/                    # 🚧 IPC 通信封装 Hooks
│   │
│   └── shared/                           # ✅ 前后端共享类型定义
│       ├── package.json
│       ├── tsconfig.json
│       └── types/
│           └── rpa.ts                    # ✅ 全部共享类型 / 枚举 / IPC 契约
```

> **状态说明**：数据库层、IPC 通信层、类型系统已完成；自动化引擎和前端渲染层为待实现状态。

---

## 3. 进程模型与通信架构

### 3.1 Electron 双进程模型

```text
┌──────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  main.ts      │  │  ipc/        │  │  engine/       │  │
│  │  - 窗口管理   │  │  handler.ts  │  │  executor.ts   │  │
│  │  - 生命周期   │◄─┤  - 任务 CRUD ├──┤  browser/      │  │
│  │  - DB 初始化  │  │  - 执行控制  │  │  desktop/      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────────┘  │
│         │                  │                              │
│    ┌────▼────┐       ┌────▼────┐                         │
│    │ preload │       │  SQLite │                         │
│    │ .ts     │       │  DB     │                         │
│    └────┬────┘       └─────────┘                         │
└─────────┼────────────────────────────────────────────────┘
          │ contextBridge (安全暴露)
          │ IPC invoke/handle + send/on
┌─────────▼────────────────────────────────────────────────┐
│                   Renderer Process (Chromium)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ pages/   │  │components│  │ hooks/   │  │  React   │ │
│  │ 仪表盘   │  │ 任务卡片 │  │ useIpc   │  │  App     │ │
│  │ 编排页   │  │ 日志流   │  │ invoke   │  │          │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 3.2 安全通信模式

| 模式 | 方法 | 方向 | 用途 |
|------|------|------|------|
| **Request-Response** | `ipcRenderer.invoke` → `ipcMain.handle` | 双向异步 | 任务 CRUD、执行控制、查询状态 |
| **Event Push** | `ipcMain.send` → `ipcRenderer.on` | 主→渲染 | 日志流推送、进度更新、执行完成通知 |
| **One-way Send** | `ipcRenderer.send` → `ipcMain.on` | 渲染→主 | 单向通知 |

**安全策略**：
- `contextIsolation: true` — 渲染进程无法直接访问 Node.js API
- `nodeIntegration: false` — 禁用 `require()` 注入
- `preload.ts` 通过 `contextBridge.exposeInMainWorld` 仅暴露白名单 API

**Preload 暴露接口**：

```typescript
// window.electronAPI 包含:
interface IPCInvokeAPI {
  invoke: <T, R>(channel: IPCChannel, payload?: T) => Promise<R>;
}
interface IPCSendAPI {
  send: (channel: IPCChannel, payload?: unknown) => void;
  on: (channel: IPCChannel, callback) => void;
  once: (channel: IPCChannel, callback) => void;
  removeListener: (channel: IPCChannel, callback) => void;
}
```

---

## 4. IPC 通信契约

### 4.1 通道枚举 (`IPCChannel`)

完整定义见 [rpa.ts](apps/shared/types/rpa.ts#L173-L202)

| 分组 | 通道 | 方向 | 说明 |
|------|------|------|------|
| **任务管理** | `task:create` / `start` / `pause` / `resume` / `stop` | R→M→R | 任务流全生命周期控制 |
| | `task:getStatus` / `getList` / `delete` | R→M→R | 查询与删除 |
| **执行控制** | `execution:start` / `stop` / `pause` / `resume` / `getState` | R→M→R | 执行器控制 |
| **日志事件** | `log:stream` / `progress:update` | M→R | 实时数据推送 |
| | `step:complete` / `execution:complete` | M→R | 事件通知 |
| **数据** | `db:query` / `saveFlow` / `getFlows` / `deleteFlow` | R→M→R | 数据库操作 |

### 4.2 请求/响应协议

```typescript
// 统一请求封装 (由 preload.ts 自动生成)
interface IPCRequest<T> {
  id: string;          // 唯一请求 ID (timestamp + random)
  channel: IPCChannel; // 通道枚举
  payload: T;          // 业务数据
  timestamp: number;
}

// 统一响应封装 (由 handler.ts 包装)
interface IPCResponse<T> {
  id: string;
  success: boolean;
  data?: T;       // 成功时返回
  error?: string; // 失败时返回
  timestamp: number;
}
```

---

## 5. 数据持久化层

### 5.1 数据库配置

- **引擎**: SQLite 3 (通过 `sqlite3` Node 绑定)
- **ORM**: TypeORM 0.3 的 DataSource + Entity 模式
- **数据库文件**: `./data/rpa.db` (相对于应用执行路径)
- **同步模式**: 开发环境 `synchronize: true`（自动建表），生产环境建议迁移

### 5.2 实体关系图

```text
┌─────────────────────────────┐       ┌──────────────────────────────┐
│        task_flows           │       │     execution_records         │
├─────────────────────────────┤       ├──────────────────────────────┤
│ id             TEXT (PK)    │──┐    │ id              TEXT (PK)     │
│ name           TEXT         │  │    │ flow_id         TEXT (FK) ────┘
│ description    TEXT         │  └────│ status          TEXT
│ steps_json     TEXT (JSON)  │       │ start_time      TEXT
│ variables_json TEXT (JSON)  │       │ end_time        TEXT (nullable)
│ created_at     TEXT         │       │ logs_json       TEXT (JSON)
│ updated_at     TEXT         │       │ result_json     TEXT (JSON, nullable)
└─────────────────────────────┘       └──────────────────────────────┘
```

### 5.3 Entity → Domain 转换

数据库存储 JSON 字段，通过 IPC 返回时解析为强类型对象：

```text
┌──────────────┐    parsed from     ┌────────────┐
│ TaskFlowEntity│ ──stepsJson────────▶ TaskStep[] │
│               │ ──variablesJson───▶ Record      │
└──────────────┘                    └────────────┘
```

**TaskFlowEntity** 将 `TaskStep[]` 和 `variables` 序列化为 JSON 字符串存储；
**TaskFlow (domain)** 将 JSON 解析回结构化数组，方便前端渲染和执行器消费。

---

## 6. 自动化引擎架构

### 6.1 浏览器自动化 (`engine/browser/` — 🚧 待实现)

基于 **Playwright** 封装，支持三种浏览器引擎：

```typescript
enum BrowserActionType {
  GOTO, CLICK, TYPE, SELECT, SCROLL,
  SCREENSHOT, GET_TEXT, GET_ATTRIBUTE,
  WAIT_FOR_SELECTOR, WAIT_FOR_NAVIGATION,
  EVALUATE, DOWNLOAD, UPLOAD,
}
```

**设计要点**：
- 内置连接池管理，支持多 Tab 并行操作
- 可配置 `headless` / `proxy` / `userAgent` / `viewport`
- 每个 BrowserAction 自带 `timeout` 和 `retry` 机制
- 支持截图和 DOM 内容提取作为步骤验证

### 6.2 桌面自动化 (`engine/desktop/` — 🚧 待实现)

分层策略：上层用 `nut-js` 处理简单场景，下层调用 `edge-js` 的 C# Worker 做深度 UIA 解析。

```text
┌─────────────────────────────────────────────┐
│           DesktopAction Executor             │
├─────────────────────────────────────────────┤
│  Layer 1: @nut-tree/nut-js                  │
│  - 图像识别定位 (findImage)                  │
│  - 键鼠模拟 (click, type, drag, hotkey)      │
├─────────────────────────────────────────────┤
│  Layer 2: edge-js → C# UIA Worker           │
│  - 枚举窗口 / 控件树 (FindWindow, FindAll)   │
│  - 深度属性提取 (GetElementProperty)          │
│  - 控件模式调用 (Invoke, Toggle, Expand)      │
│  - 进程级激活 (ActivateWindow)               │
└─────────────────────────────────────────────┘
```

```typescript
enum DesktopActionType {
  CLICK, RIGHT_CLICK, DOUBLE_CLICK, DRAG,
  TYPE, HOTKEY, SCROLL,
  FIND_WINDOW, ACTIVATE_WINDOW, GET_WINDOW_RECT,
  TAKE_SCREENSHOT, FIND_IMAGE, WAIT_FOR_IMAGE,
  GET_ELEMENT_PROPERTY,
}
```

### 6.3 任务流执行器 (`engine/executor.ts` — 🚧 待实现)

执行器采用**状态机**模型，管理任务流的完整执行生命周期：

```text
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ startExecution()
                    ┌────▼─────┐
              ┌─────│ RUNNING  │◄──────────┐
              │     └────┬─────┘           │
              │          │ 按步骤顺序执行    │
              │     ┌────▼─────┐           │
              │     │ STEP i   │───────────┤
              │     └────┬─────┘ pause()   │
              │          │                  │
         ┌────┴────┐ ┌──┴───┐ ┌──────────┐ │
         │SUCCESS  │ │FAILED│ │CANCELLED │ │
         └─────────┘ └──────┘ └──────────┘ │
                                            │
                    ┌──────────┐            │
                    │ PAUSED   ├────────────┘
                    └──────────┘ resume()
```

**核心特性**：
- **步骤编排**：按 `TaskStep[].next` 链式执行，支持条件跳转
- **错误处理**：每个步骤可配置 `retry` / `skip` / `stop` / `goto` 策略
- **上下文传递**：`Map<string, unknown>` 在步骤间传递变量
- **实时反馈**：通过 `progress:update` 和 `log:stream` 推送执行状态
- **资源清理**：`dispose()` 方法在应用退出时关闭所有浏览器和 UIA 连接

---

## 7. 类型系统全景

共享类型定义在 [rpa.ts](apps/shared/types/rpa.ts)，覆盖以下领域：

| 分类 | 核心类型 | 说明 |
|------|----------|------|
| **任务定义** | `TaskType`, `TaskStatus` | 枚举：BROWSER/DESKTOP/HYBRID 和 6 种状态 |
| **浏览器操作** | `BrowserConfig`, `BrowserAction`, `BrowserActionType` | Playwright 操作的抽象描述 |
| **桌面操作** | `DesktopConfig`, `DesktopAction`, `DesktopActionType` | 桌面自动化的抽象描述 |
| **任务编排** | `TaskFlow`, `TaskStep`, `StepCondition`, `ErrorHandler` | 流程编排的完整数据结构 |
| **执行上下文** | `ExecutionContext`, `BrowserSession`, `DesktopSession` | 运行时上下文与连接管理 |
| **日志** | `ExecutionLog` | 结构化日志 |
| **IPC** | `IPCChannel`, `IPCRequest`, `IPCResponse` | 通信契约 |
| **DB 实体** | `TaskFlowEntity`, `ExecutionRecordEntity` | 数据库映射 |
| **UI** | `DashboardStats`, `LogEntry`, `TaskCardProps` | 前端展示数据 |

---

## 8. 数据流全景

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          用户操作流程                                      │
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ 编排任务   │───▶ 保存流    │───▶ 启动执行  │───▶ 监控实时日志       │  │
│  │ (Page)    │    │ (IPC)    │    │ (IPC)    │    │ (Log Stream)      │  │
│  └──────────┘    └──────────┘    └──────────┘    └───────────────────┘  │
│       │               │               │                    ▲            │
│       ▼               ▼               ▼                    │            │
│  ┌──────────────────────────────────────────────────────────┴──────┐   │
│  │                      Main Process                               │   │
│  │  ┌──────────┐   ┌────────────┐   ┌─────────────┐                │   │
│  │  │ handler  │──▶│ executor   │──▶│ browser/    │──▶ Playwright   │   │
│  │  │ .ts      │   │ .ts        │   │ desktop/    │──▶ nut-js/UIA  │   │
│  │  └────┬─────┘   └─────┬──────┘   └─────────────┘                │   │
│  │       │               │                                         │   │
│  │  ┌────▼─────┐   ┌─────▼──────┐                                 │   │
│  │  │  SQLite  │   │  EventBus  │──▶ log:stream                   │   │
│  │  │  DB      │   │            │──▶ progress:update               │   │
│  │  └──────────┘   └───────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. 构建与部署

### 9.1 开发命令

```bash
# 一键启动 (主进程 TypeScript 编译 + Vite 开发服务器)
npm run dev
  # → npm-run-all --parallel dev:electron dev:renderer
  #   → apps/electron: tsc && electron .
  #   → apps/renderer: vite dev (port 5173)

# 单独构建
npm run build:electron   # tsc 编译 → out/
npm run build:renderer   # vite build → dist/

# 打包分发
npm run dist             # electron-builder → dist/
# 目标: Windows (NSIS) / macOS (DMG) / Linux (AppImage)
```

### 9.2 开发环境判断

```typescript
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  // 加载 Vite 开发服务器 (hot-reload)
  mainWindow.loadURL('http://localhost:5173');
  mainWindow.openDevTools();
} else {
  // 加载构建产物
  mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
}
```

---

## 10. 当前状态与 Roadmap

| 模块 | 状态 | 说明 |
|------|------|------|
| `apps/shared/types/rpa.ts` | ✅ 完成 | 全部共享类型、枚举、IPC 契约 |
| `apps/electron/src/main.ts` | ✅ 完成 | 窗口创建、DB/Preload/IPC 初始化、生命周期 |
| `apps/electron/src/preload.ts` | ✅ 完成 | 安全的 IPC 桥接层 |
| `apps/electron/src/ipc/handler.ts` | ✅ 完成 | 任务 CRUD + 执行控制 IPC |
| `apps/electron/src/db/` | ✅ 完成 | SQLite 配置 + TaskFlow / ExecutionRecord 实体 |
| `apps/electron/src/engine/` | 🚧 待实现 | 核心执行器 + 浏览器/桌面驱动 |
| `apps/renderer/` | 🚧 待实现 | React 前端界面 |
| `apps/electron/src/engine/browser/` | 🚧 待实现 | Playwright 封装 |
| `apps/electron/src/engine/desktop/` | 🚧 待实现 | nut-js + edge-js UIA 封装 |

---

## 11. 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Monorepo 组织 | npm workspaces | 简单、零额外依赖、TypeScript 项目引用 |
| 主进程编译 | tsc (无 esbuild) | Electron 主进程需 CommonJS/ESM 兼容，tsc 更安全 |
| 渲染进程构建 | Vite | 开发热更新、React 生态最佳集成 |
| 数据库 ORM | TypeORM | 成熟、Entity 装饰器声明式映射、迁移支持 |
| 桌面 UIA | edge-js (Edge.js) | 在 Node.js 进程中内联调用 C#，无需独立 Worker 进程 |
| IPC 协议 | 统一 Request/Response | 请求 ID 可追踪、统一错误处理、便于日志审计 |