# Windows 混合 RPA 机器人

基于 TypeScript + Electron 的 Windows 自动化客户端，能够同时无缝操控**浏览器（Web）**与**Windows 桌面客户端（Desktop）**，并提供可视化的 GUI 操作界面。

---

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式启动（主进程 + 渲染进程并行）
npm run dev

# 构建
npm run build

# 打包分发
npm run dist
```

**前置要求**：Node.js >= 18.0.0

---

## 技术栈

| 层级 | 选型 | 用途 |
|------|------|------|
| **GUI 外壳** | Electron 28 + TypeScript 5.3 | 跨平台桌面容器 |
| **前端展示** | React + TailwindCSS + shadcn/ui | 可视化操作界面 |
| **构建工具** | Vite (renderer) + tsc (electron) | 前后端分别构建 |
| **浏览器自动化** | Playwright 1.40 | Chromium / Firefox / WebKit |
| **桌面自动化** | `@nut-tree/nut-js` 3.x (图像+键鼠) + `edge-js` (UIA 控件树) | Windows 桌面操控 |
| **数据持久化** | `better-sqlite3` + TypeORM 0.3 | 任务流与执行记录 |
| **包管理** | npm workspaces | apps/ 三层 monorepo |

---

## 项目结构

```
├── package.json                     # Monorepo 根配置
├── apps/
│   ├── electron/                    # Electron 主进程
│   │   └── src/
│   │       ├── main.ts              # 入口：窗口创建 / DB 初始化 / IPC 注册
│   │       ├── preload.ts           # 安全 IPC 桥接层
│   │       ├── ipc/handler.ts       # IPC 处理器
│   │       ├── db/                  # SQLite 数据库 (TypeORM)
│   │       │   └── entities/        # TaskFlow, ExecutionRecord 实体
│   │       └── engine/              # 自动化引擎 (待实现)
│   │           ├── executor.ts      # 任务流执行器 (状态机)
│   │           ├── browser/         # Playwright 封装
│   │           └── desktop/         # nut-js + edge-js UIA 封装
│   │
│   ├── renderer/                    # React 前端 GUI (待实现)
│   └── shared/                      # 前后端共享类型
│       └── types/rpa.ts             # 类型枚举、IPC 契约、实体定义
```

---

## 架构概要

### 双进程模型

```
┌─ Main Process (Node.js) ─────────────────────────┐
│  main.ts → ipc/handler → engine/executor          │
│              │                        │            │
│           SQLite DB            browser/ desktop/   │
└─────────────┼────────────────────────────────────┘
              │ contextBridge (安全 IPC)
┌─ Renderer (Chromium) ────────────────────────────┐
│  React + shadcn/ui → hooks → electronAPI.invoke   │
└──────────────────────────────────────────────────┘
```

- **主进程**：自动化引擎、数据库、IPC 服务
- **渲染进程**：GUI 展示、任务编排、实时日志
- **Preload**：`contextBridge` 仅暴露白名单 API，禁用 `nodeIntegration`

### 自动化引擎

| 引擎 | 能力 | 技术 |
|------|------|------|
| 浏览器 | 导航、点击、输入、截图、爬取 | Playwright |
| 桌面 (L1) | 图像识别定位、键鼠模拟 | `@nut-tree/nut-js` |
| 桌面 (L2) | 窗口枚举、控件树解析、属性提取 | `edge-js` → C# UIA |

### 任务执行状态机

```
PENDING → RUNNING ⇄ PAUSED → SUCCESS / FAILED / CANCELLED
```

每个步骤支持 `retry` / `skip` / `stop` / `goto` 错误处理策略。

---

## IPC 通信

统一 Request/Response 协议，双向异步调用 + 事件推送：

```typescript
// 请求
interface IPCRequest<T> {
  id: string;
  channel: IPCChannel;
  payload: T;
  timestamp: number;
}
// 响应
interface IPCResponse<T> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
```

**通道分组**：
- **任务管理**：create / start / pause / resume / stop / delete / getList
- **执行控制**：execution:start / stop / pause / resume / getState
- **日志事件**：log:stream / progress:update / step:complete / execution:complete
- **数据**：db:query / saveFlow / getFlows / deleteFlow

---

## 数据库

| 表 | 字段 | 说明 |
|----|------|------|
| `task_flows` | id, name, desc, steps_json, variables_json, timestamps | 任务流定义 |
| `execution_records` | id, flow_id, status, logs_json, result_json, timestamps | 执行记录 |

JSON 字段在 IPC 边界序列化/反序列化，保持数据库简洁、应用层强类型。

---

## 开发

```bash
npm run dev          # 一键启动（主进程 tsc + 渲染进程 Vite HMR）
npm run build        # 构建所有子包
npm run dist         # electron-builder 打包 (NSIS / DMG / AppImage)
```

渲染进程开发服务器默认运行在 `http://localhost:5173`，主进程通过 `NODE_ENV` 判断加载开发服务器或构建产物。

---

## 许可

MIT
