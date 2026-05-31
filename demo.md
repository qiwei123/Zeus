# 有言RPA - Tauri + React + Node.js 重构说明文档

## 项目概述

**原项目**: Flutter 桌面应用 (有言RPA v1.0.4)  
**目标架构**: Tauri (Rust后端) + React (前端) + Node.js (辅助服务)  
**项目类型**: RPA (机器人流程自动化) 客户端应用

---

## 一、原项目功能分析

### 1.1 核心功能模块

| 模块 | 功能描述 | 技术实现 |
|------|----------|----------|
| **用户认证** | 登录/登出、Token刷新、自动登录、记住密码 | AES加密、SharedPreferences存储 |
| **机器人管理** | 我的机器人列表、官方市场、机器人详情 | HTTP API、状态管理 |
| **本地执行** | 机器人本地运行、执行日志、录屏功能 | Process spawning、FFmpeg、SQLite |
| **调度模式** | 定时任务、协程池管理 | Cron、Stream、任务队列 |
| **系统托盘** | 最小化到托盘、右键菜单、快捷操作 | System tray、Hotkey |
| **窗口管理** | 自定义标题栏、窗口控制、单实例 | Window manager |
| **心跳检测** | 在线状态维护、多端登录踢出 | Timer、WebSocket |
| **自动更新** | 版本检测、增量更新 | Auto-updater |

### 1.2 数据模型

```typescript
// 核心数据模型映射

// Robot - 机器人
interface Robot {
  id: number;
  name: string;
  description: string;
  author: string;
  updatedAt: string;
  canAcquire: boolean;
  acquiredAt?: string;
  tags: RobotTag[];
  versionedRobot: VersionedRobot;
  platforms: Platform[];
}

// CurrentUser - 当前用户
interface CurrentUser {
  id: number;
  username: string;
  token: string;
  permissions: string[];
  role: string;
  newPasswordRequired: boolean;
}

// LocalExecutionResult - 本地执行结果
interface LocalExecutionResult {
  id: number;
  robotId: number;
  robotName: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'failed' | 'cancelled';
  logs: string[];
  screencastPath?: string;
}

// ScheduleTask - 调度任务
interface ScheduleTask {
  id: number;
  robotId: number;
  cronExpression: string;
  nextRunTime: string;
  enabled: boolean;
}
```

### 1.3 状态管理结构

```
原项目使用 Flutter Riverpod + Provider 混合状态管理

迁移到 React 后的状态管理方案:
- Zustand: 全局状态 (用户认证、配置)
- React Query: 服务器状态 (API数据缓存)
- Context API: 主题、窗口管理
- Local State: 组件级状态
```

---

## 二、技术栈对比与迁移方案

### 2.1 技术栈对比表

| 功能 | 原 Flutter 方案 | 新 Tauri + React 方案 |
|------|-----------------|------------------------|
| **UI框架** | Fluent UI (fluent_ui 4.1.5) | React + Fluent UI React |
| **状态管理** | Riverpod + Provider | Zustand + React Query |
| **路由** | Navigator 2.0 | React Router v6 |
| **HTTP客户端** | Dio + http | Axios + React Query |
| **本地存储** | shared_preferences | Tauri Store API |
| **数据库** | sqflite (SQLite) | SQLite (rustqlite) |
| **进程管理** | dart:io Process | Tauri Command (Rust) |
| **系统托盘** | tray_manager | Tauri System Tray |
| **全局快捷键** | hotkey_manager | Tauri Global Shortcut |
| **窗口管理** | window_manager | Tauri Window API |
| **日志** | logging + file | Rust tracing + 前端集成 |
| **自动更新** | auto_updater | Tauri Updater |

### 2.2 项目结构规划

```
youyan-rpa-tauri/
├── src/                          # React 前端源码
│   ├── components/               # 通用组件
│   │   ├── ui/                   # 基础UI组件
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Table/
│   │   │   ├── Dialog/
│   │   │   ├── Toast/
│   │   │   ├── Checkbox/
│   │   │   ├── Radio/
│   │   │   └── ...
│   │   ├── layout/               # 布局组件
│   │   │   ├── Navigation/
│   │   │   ├── WindowCaption/
│   │   │   └── MainLayout/
│   │   └── common/               # 业务通用组件
│   │       ├── RobotCard/
│   │       ├── ExecutionLog/
│   │       └── StatusTag/
│   │
│   ├── pages/                    # 页面组件
│   │   ├── Login/
│   │   │   ├── index.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── styles.module.css
│   │   ├── Home/
│   │   │   ├── index.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── MyRobots/
│   │   │   ├── index.tsx
│   │   │   ├── RobotList.tsx
│   │   │   ├── RobotFilter.tsx
│   │   │   └── RobotDetail/
│   │   ├── PublicRobots/
│   │   │   ├── index.tsx
│   │   │   └── MarketList.tsx
│   │   ├── LocalExecution/
│   │   │   ├── index.tsx
│   │   │   ├── ExecutionPanel.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── ScreenRecorder.tsx
│   │   ├── ExecutionLog/
│   │   │   ├── index.tsx
│   │   │   └── LogTable.tsx
│   │   └── Settings/
│   │       └── index.tsx
│   │
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useAuth.ts            # 认证相关
│   │   ├── useRobot.ts           # 机器人操作
│   │   ├── useExecution.ts       # 执行控制
│   │   ├── useSchedule.ts        # 调度任务
│   │   ├── useWindow.ts          # 窗口管理
│   │   ├── useTray.ts            # 托盘操作
│   │   └── useStorage.ts         # 本地存储
│   │
│   ├── stores/                   # Zustand状态管理
│   │   ├── authStore.ts
│   │   ├── robotStore.ts
│   │   ├── executionStore.ts
│   │   ├── scheduleStore.ts
│   │   ├── settingsStore.ts
│   │   └── index.ts
│   │
│   ├── api/                      # API客户端
│   │   ├── client.ts             # Axios实例
│   │   ├── auth.ts               # 认证API
│   │   ├── robot.ts              # 机器人API
│   │   ├── execution.ts          # 执行API
│   │   ├── schedule.ts           # 调度API
│   │   └── types.ts              # API类型定义
│   │
│   ├── services/                 # 前端服务
│   │   ├── heartbeat.ts          # 心跳服务
│   │   ├── websocket.ts          # WebSocket连接
│   │   └── logger.ts             # 前端日志
│   │
│   ├── utils/                    # 工具函数
│   │   ├── crypto.ts             # 加密解密
│   │   ├── format.ts             # 格式化
│   │   ├── validate.ts           # 验证规则
│   │   ├── constants.ts          # 常量定义
│   │   └── helpers.ts            # 辅助函数
│   │
│   ├── types/                    # TypeScript类型
│   │   ├── index.ts
│   │   ├── robot.ts
│   │   ├── user.ts
│   │   ├── execution.ts
│   │   └── schedule.ts
│   │
│   ├── styles/                   # 全局样式
│   │   ├── index.css
│   │   ├── variables.css
│   │   └── fluent-ui-override.css
│   │
│   ├── App.tsx                   # 根组件
│   ├── main.tsx                  # 入口文件
│   └── vite-env.d.ts
│
├── src-tauri/                    # Tauri Rust后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 库导出
│   │   ├── commands/             # 命令处理器
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs           # 认证命令
│   │   │   ├── robot.rs          # 机器人命令
│   │   │   ├── execution.rs      # 执行命令
│   │   │   ├── schedule.rs       # 调度命令
│   │   │   ├── window.rs         # 窗口命令
│   │   │   ├── tray.rs           # 托盘命令
│   │   │   ├── storage.rs        # 存储命令
│   │   │   └── system.rs         # 系统命令
│   │   │
│   │   ├── services/             # 后端服务
│   │   │   ├── mod.rs
│   │   │   ├── robot_runner.rs   # 机器人运行服务
│   │   │   ├── schedule_runner.rs # 调度服务
│   │   │   ├── heartbeat.rs       # 心跳服务
│   │   │   ├── file_logger.rs     # 文件日志
│   │   │   ├── screen_recorder.rs # 录屏服务
│   │   │   ├── server.rs          # 本地服务器
│   │   │   └── updater.rs         # 更新服务
│   │   │
│   │   ├── models/                # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── robot.rs
│   │   │   ├── user.rs
│   │   │   ├── execution.rs
│   │   │   └── settings.rs
│   │   │
│   │   ├── database/              # 数据库
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs      # 连接管理
│   │   │   ├── migrations/        # 迁移文件
│   │   │   └── repositories/      # 数据仓库
│   │   │
│   │   ├── utils/                 # 工具函数
│   │   │   ├── mod.rs
│   │   │   ├── crypto.rs          # 加密
│   │   │   ├── process.rs         # 进程管理
│   │   │   ├── file.rs            # 文件操作
│   │   │   └── logger.rs          # 日志
│   │   │
│   │   └── config.rs              # 配置管理
│   │
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── tauri.windows.conf.json
│   └── tauri.macos.conf.json
│
├── node-service/                 # Node.js 辅助服务 (可选)
│   ├── src/
│   │   ├── index.ts
│   │   ├── services/
│   │   │   ├── python-runner.ts
│   │   │   └── package-manager.ts
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── public/                       # 静态资源
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   └── schemas/
│
├── docs/                         # 文档
├── scripts/                      # 构建脚本
├── tests/                        # 测试文件
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 三、核心功能实现指南

### 3.1 用户认证系统

#### 3.1.1 前端实现 (React + Zustand)

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/tauri';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  autoLogin: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          // 调用 Tauri 命令进行登录
          const result = await invoke<LoginResponse>('auth_login', {
            username,
            password,
          });
          
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // 启动心跳
          await invoke('start_heartbeat', { token: result.token });
        } catch (error) {
          set({ 
            error: error as string, 
            isLoading: false 
          });
        }
      },

      logout: async () => {
        await invoke('auth_logout');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      autoLogin: async () => {
        const savedState = get(); // 从持久化存储读取
        if (!savedState.token) return;
        
        set({ isLoading: true });
        try {
          const result = await invoke<LoginResponse>('auth_auto_login');
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      refreshToken: async () => {
        try {
          const newToken = await invoke<string>('auth_refresh_token');
          set({ token: newToken });
        } catch (error) {
          // Token 刷新失败，登出
          await get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

#### 3.1.2 后端实现 (Tauri Rust)

```rust
// src-tauri/src/commands/auth.rs
use tauri::{command, State, AppHandle};
use crate::models::{User, LoginRequest, LoginResponse};
use crate::services::heartbeat::HeartbeatService;
use crate::utils::crypto::{encrypt, decrypt};
use std::sync::Arc;
use tokio::sync::Mutex;

#[command]
pub async fn auth_login(
    username: String,
    password: String,
    app_handle: AppHandle,
    heartbeat: State<'_, Arc<Mutex<HeartbeatService>>>,
) -> Result<LoginResponse, String> {
    // 调用后端API进行认证
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/auth/login", crate::config::API_BASE_URL))
        .json(&json!({
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err("登录失败".to_string());
    }

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    if data["err_code"].as_i64() != Some(0) {
        return Err(data["err_msg"].as_str().unwrap_or("登录失败").to_string());
    }

    let token = data["payload"]["token"].as_str().unwrap().to_string();
    let user: User = serde_json::from_value(data["payload"]["user_info"].clone())
        .map_err(|e| e.to_string())?;

    // 存储加密后的登录状态
    let store = app_handle.state::<crate::database::Storage>();
    let encrypted_data = encrypt(&json!({
        "username": username,
        "password": password, // 实际应该使用token或更安全的机制
        "token": token,
    }).to_string())?;
    
    store.set("user_login_state", encrypted_data)?;

    // 启动心跳服务
    let mut hb = heartbeat.lock().await;
    hb.start(token.clone()).await?;

    Ok(LoginResponse { user, token })
}

#[command]
pub async fn auth_logout(
    heartbeat: State<'_, Arc<Mutex<HeartbeatService>>>,
) -> Result<(), String> {
    let mut hb = heartbeat.lock().await;
    hb.stop().await?;
    Ok(())
}

#[command]
pub async fn auth_auto_login(
    app_handle: AppHandle,
) -> Result<LoginResponse, String> {
    let store = app_handle.state::<crate::database::Storage>();
    let encrypted_state: String = store.get("user_login_state")
        .map_err(|_| "没有保存的登录状态")?;
    
    let decrypted = decrypt(&encrypted_state)?;
    let state: serde_json::Value = serde_json::from_str(&decrypted)
        .map_err(|_| "登录状态解析失败")?;

    // 验证token是否有效
    let token = state["token"].as_str().unwrap_or("");
    // ... 验证token并返回用户信息

    Ok(LoginResponse { user, token: token.to_string() })
}
```

### 3.2 机器人本地执行系统

#### 3.2.1 执行器服务 (Rust)

```rust
// src-tauri/src/services/robot_runner.rs
use std::process::{Command, Stdio};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::process::{Child, Command as TokioCommand};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionConfig {
    pub robot_id: i32,
    pub robot_name: String,
    pub hololib_url: String,
    pub hololib_md5: String,
    pub work_dir: String,
    pub need_screencast: bool,
    pub screencast_duration: i32,
}

pub struct RobotRunner {
    app_handle: AppHandle,
    current_process: Arc<RwLock<Option<Child>>>,
    is_running: Arc<Mutex<bool>>,
}

impl RobotRunner {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            current_process: Arc::new(RwLock::new(None)),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn start_execution(
        &self,
        config: ExecutionConfig,
    ) -> Result<(), String> {
        // 检查是否已在运行
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            return Err("已有机器人正在运行".to_string());
        }
        *is_running = true;

        // 准备执行环境
        self.prepare_env(&config).await?;

        // 下载 hololib
        self.download_hololib(&config.hololib_url, &config.hololib_md5).await?;

        // 启动机器人进程
        let mut child = TokioCommand::new("python")
            .arg("-m")
            .arg("robot_runner")
            .arg("--robot-id")
            .arg(config.robot_id.to_string())
            .arg("--work-dir")
            .arg(&config.work_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动失败: {}", e))?;

        // 存储进程句柄
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        
        let mut process_guard = self.current_process.write().await;
        *process_guard = Some(child);

        // 启动日志收集
        self.spawn_log_collectors(stdout, stderr, config.robot_name.clone());

        // 启动录屏（如果需要）
        if config.need_screencast {
            self.start_screen_recording(&config).await?;
        }

        // 发送开始事件
        self.app_handle.emit("execution:started", &config)?;

        Ok(())
    }

    fn spawn_log_collectors(
        &self,
        stdout: tokio::process::ChildStdout,
        stderr: tokio::process::ChildStderr,
        robot_name: String,
    ) {
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();

        // 标准输出收集
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                // 解析日志级别
                let (level, message) = parse_log_line(&line);
                
                // 保存到数据库
                // ...

                // 发送到前端
                app_handle.emit("execution:log", json!({
                    "robot_name": robot_name,
                    "level": level,
                    "message": message,
                    "timestamp": chrono::Local::now().to_rfc3339(),
                })).ok();
            }

            *is_running.lock().await = false;
        });

        // 标准错误收集
        // ...
    }

    pub async fn stop_execution(&self) -> Result<(), String> {
        let mut process = self.current_process.write().await;
        if let Some(mut child) = process.take() {
            // 优雅地终止进程
            child.kill().await.map_err(|e| e.to_string())?;
            
            // 清理资源
            self.cleanup().await?;
            
            self.app_handle.emit("execution:stopped", ())?;
        }
        Ok(())
    }

    pub async fn get_status(&self) -> ExecutionStatus {
        let is_running = *self.is_running.lock().await;
        ExecutionStatus {
            is_running,
            // ...
        }
    }

    // 准备执行环境
    async fn prepare_env(&self, config: &ExecutionConfig) -> Result<(), String> {
        // 创建工作目录
        tokio::fs::create_dir_all(&config.work_dir).await
            .map_err(|e| format!("创建工作目录失败: {}", e))?;
        
        // 检查Python环境
        // ...
        
        Ok(())
    }

    // 下载 hololib
    async fn download_hololib(&self, url: &str, expected_md5: &str) -> Result<(), String> {
        // 检查本地文件
        let local_path = format!("{}/hololib", std::env::temp_dir().display());
        
        if std::path::Path::new(&local_path).exists() {
            // 验证MD5
            let md5 = calculate_md5(&local_path)?;
            if md5 == expected_md5 {
                return Ok(());
            }
        }

        // 下载文件
        let client = reqwest::Client::new();
        let response = client.get(url).send().await.map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        
        tokio::fs::write(&local_path, bytes).await
            .map_err(|e| format!("写入文件失败: {}", e))?;

        Ok(())
    }
}
```

### 3.3 调度模式实现

```typescript
// src/services/schedule.ts
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export interface ScheduleConfig {
  robotId: number;
  cronExpression: string;
  enabled: boolean;
}

class ScheduleService {
  private tasks: Map<number, ScheduleConfig> = new Map();

  async initialize() {
    // 从数据库加载所有调度任务
    const tasks = await invoke<ScheduleConfig[]>('schedule_get_all');
    tasks.forEach(task => {
      this.tasks.set(task.robotId, task);
      if (task.enabled) {
        this.startTask(task);
      }
    });

    // 监听调度事件
    await listen('schedule:trigger', (event) => {
      const { robotId } = event.payload as { robotId: number };
      this.onScheduleTrigger(robotId);
    });
  }

  async addTask(config: ScheduleConfig) {
    await invoke('schedule_add', { config });
    this.tasks.set(config.robotId, config);
    
    if (config.enabled) {
      this.startTask(config);
    }
  }

  async removeTask(robotId: number) {
    await invoke('schedule_remove', { robotId });
    this.stopTask(robotId);
    this.tasks.delete(robotId);
  }

  private async startTask(config: ScheduleConfig) {
    await invoke('schedule_start', { robotId: config.robotId });
  }

  private async stopTask(robotId: number) {
    await invoke('schedule_stop', { robotId });
  }

  private async onScheduleTrigger(robotId: number) {
    // 执行机器人
    const robot = await invoke<Robot>('robot_get', { id: robotId });
    await invoke('execution_start', { robot });
  }
}

export const scheduleService = new ScheduleService();
```

### 3.4 录屏功能实现

```rust
// src-tauri/src/services/screen_recorder.rs
use std::process::Stdio;
use tokio::process::Command;
use tauri::AppHandle;

pub struct ScreenRecorder {
    ffmpeg_process: Option<tokio::process::Child>,
}

impl ScreenRecorder {
    pub fn new() -> Self {
        Self { ffmpeg_process: None }
    }

    pub async fn start(
        &mut self,
        output_path: &str,
        duration: i32,
    ) -> Result<(), String> {
        // 获取屏幕尺寸
        let (width, height) = self.get_screen_size()?;

        // 启动 FFmpeg 录屏
        let child = Command::new("ffmpeg")
            .args(&[
                "-f", "gdigrab",           // Windows 屏幕捕获
                "-framerate", "30",
                "-video_size", &format!("{}x{}", width, height),
                "-i", "desktop",
                "-t", &duration.to_string(), // 录制时长
                "-pix_fmt", "yuv420p",
                "-preset", "ultrafast",
                output_path,
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("启动 FFmpeg 失败: {}", e))?;

        self.ffmpeg_process = Some(child);
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<String, String> {
        if let Some(mut child) = self.ffmpeg_process.take() {
            // 发送终止信号 (FFmpeg 会优雅地结束录制)
            #[cfg(windows)]
            child.kill().await.map_err(|e| e.to_string())?;

            // 等待进程结束
            child.wait().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn get_screen_size(&self) -> Result<(u32, u32), String> {
        // 使用 Windows API 获取屏幕尺寸
        // 或调用 Tauri 的窗口 API
        Ok((1920, 1080)) // 示例
    }
}
```

---

## 四、Tauri 配置

### 4.1 tauri.conf.json

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true,
        "execute": true,
        "sidecar": true
      },
      "window": {
        "all": true,
        "create": true,
        "center": true,
        "setTitle": true,
        "maximize": true,
        "minimize": true,
        "unminimize": true,
        "show": true,
        "hide": true,
        "close": true,
        "setSize": true,
        "setResizable": true,
        "setFullscreen": true,
        "setDecorations": false,
        "setAlwaysOnTop": true,
        "setSkipTaskbar": true,
        "startDragging": true
      },
      "fs": {
        "all": true,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "copyFile": true,
        "createDir": true,
        "removeDir": true,
        "removeFile": true,
        "renameFile": true,
        "exists": true
      },
      "path": {
        "all": true
      },
      "os": {
        "all": true
      },
      "notification": {
        "all": true
      },
      "http": {
        "all": true,
        "request": true
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true,
        "message": true
      },
      "cli": {
        "all": true
      },
      "globalShortcut": {
        "all": true
      },
      "process": {
        "all": true
      },
      "protocol": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "Copyright © 2022 leyantech",
      "deb": {
        "depends": []
      },
      "externalBin": [],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.leyantech.youyanrpa",
      "longDescription": "有言RPA - 机器人流程自动化客户端",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "有言RPA客户端",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "wix": {
          "language": ["zh-CN"]
        }
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": true,
      "endpoints": [
        "https://your-api.com/update/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "有言RPA",
        "width": 1340,
        "minWidth": 1000,
        "minHeight": 600,
        "center": true,
        "decorations": false,
        "transparent": false,
        "visible": false
      }
    ],
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

---

## 五、前端组件映射

### 5.1 Flutter → React 组件映射

| Flutter Widget | React Component | 库 |
|----------------|-----------------|-----|
| `NavigationView` | `Nav` (Fluent UI) | @fluentui/react |
| `PaneItem` | `NavLink` | @fluentui/react |
| `ScaffoldPage` | `Stack` + custom layout | Fluent UI |
| `TextFormField` | `TextField` | @fluentui/react |
| `ElevatedButton` | `PrimaryButton` | @fluentui/react |
| `Checkbox` | `Checkbox` | @fluentui/react |
| `DropDownButton` | `Dropdown` | @fluentui/react |
| `Dialog` | `Dialog` | @fluentui/react |
| `ProgressBar` | `ProgressBar` | @fluentui/react |
| `DataTable` | `DetailsList` | @fluentui/react |
| `ListView` | `List` + virtualization | @fluentui/react |
| `TabBar` | `Pivot` | @fluentui/react |
| `Tooltip` | `Tooltip` | @fluentui/react |
| `MenuFlyout` | `ContextualMenu` | @fluentui/react |
| `InfoBadge` | `Badge` | custom |
| `SvgPicture` | `SVG` component | native |
| `Image.asset` | `img` | native |

### 5.2 自定义组件示例

```typescript
// src/components/layout/Navigation/index.tsx
import { Nav } from '@fluentui/react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { key: 'my-robots', name: '我的机器人', url: '/my-robots', icon: 'Robot' },
  { key: 'execution-log', name: '执行记录', url: '/execution-log', icon: 'History' },
  { key: 'market', name: '官方市场', url: '/market', icon: 'Shop' },
];

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Nav
      selectedKey={navItems.find(item => location.pathname === item.url)?.key}
      groups={[{ links: navItems }]}
      onLinkClick={(ev, item) => {
        if (item?.url) {
          navigate(item.url);
        }
      }}
    />
  );
};
```

---

## 六、数据库设计

### 6.1 SQLite Schema

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    token TEXT,
    permissions TEXT, -- JSON array
    role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 机器人表
CREATE TABLE robots (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    author TEXT,
    version TEXT,
    updated_at TIMESTAMP,
    can_acquire BOOLEAN,
    tags TEXT, -- JSON array
    platforms TEXT, -- JSON array
    local_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 执行日志表
CREATE TABLE execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    robot_id INTEGER,
    robot_name TEXT,
    execution_id TEXT UNIQUE,
    status TEXT, -- 'pending', 'running', 'success', 'failed', 'cancelled'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    logs TEXT, -- JSON array of log entries
    screencast_path TEXT,
    error_message TEXT,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

-- 调度任务表
CREATE TABLE schedule_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    robot_id INTEGER NOT NULL,
    cron_expression TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    next_run_time TIMESTAMP,
    last_run_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

-- 应用设置表
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 七、开发环境配置

### 7.1 依赖安装

```bash
# 1. 安装 Rust
# Windows: https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Node.js (推荐 v18+)
# https://nodejs.org/

# 3. 安装 Tauri CLI
cargo install tauri-cli

# 4. 创建项目
npm create tauri-app@latest youyan-rpa

# 5. 安装前端依赖
cd youyan-rpa
npm install

# 6. 安装 React 相关库
npm install react react-dom react-router-dom
npm install @fluentui/react
npm install zustand
npm install @tanstack/react-query axios
npm install date-fns
npm install react-hook-form zod

# 7. 安装 Tauri 插件
npm install @tauri-apps/api
npm install @tauri-apps/plugin-store
npm install @tauri-apps/plugin-sql
npm install @tauri-apps/plugin-log
```

### 7.2 开发命令

```bash
# 开发模式 (热重载)
npm run tauri dev

# 构建生产版本
npm run tauri build

# 仅构建前端
npm run build

# 运行测试
npm run test

# 格式化代码
npm run lint
npm run format
```

---

## 八、迁移步骤

### Phase 1: 项目搭建 (1-2周)
1. [ ] 创建 Tauri + React 项目骨架
2. [ ] 配置 Fluent UI 主题和样式系统
3. [ ] 实现窗口管理（自定义标题栏）
4. [ ] 配置系统托盘
5. [ ] 设置路由系统

### Phase 2: 核心功能 (2-3周)
1. [ ] 实现用户认证系统
2. [ ] 创建数据库和存储层
3. [ ] 实现心跳服务
4. [ ] 迁移机器人列表页面
5. [ ] 迁移机器人详情页面

### Phase 3: 执行系统 (2-3周)
1. [ ] 实现机器人下载服务
2. [ ] 实现本地执行器
3. [ ] 实现日志收集和展示
4. [ ] 实现录屏功能
5. [ ] 实现执行历史记录

### Phase 4: 高级功能 (2周)
1. [ ] 实现调度模式
2. [ ] 实现全局快捷键
3. [ ] 实现自动更新
4. [ ] 完善错误处理
5. [ ] 性能优化

### Phase 5: 测试与发布 (1-2周)
1. [ ] 编写单元测试
2. [ ] 集成测试
3. [ ] Windows 打包测试
4. [ ] macOS 打包测试
5. [ ] 发布到测试环境

---

## 九、注意事项

### 9.1 安全考虑
1. **密码加密**: 使用 AES-256 加密存储用户密码
2. **Token 安全**: 定期刷新 Token，存储在安全的位置
3. **进程隔离**: 机器人执行进程与主进程隔离
4. **文件访问**: 限制对敏感目录的访问权限

### 9.2 性能优化
1. **虚拟列表**: 大量机器人列表使用虚拟滚动
2. **日志分页**: 执行日志分页加载，避免内存溢出
3. **进程管理**: 及时清理僵尸进程
4. **资源释放**: 窗口关闭时释放所有资源

### 9.3 兼容性
1. **Windows 10/11**: 测试不同 Windows 版本
2. **屏幕 DPI**: 支持高分屏显示
3. **主题适配**: 支持浅色/深色主题
4. **中文支持**: 确保中文字体正确显示

---

## 十、API 接口定义

### 10.1 后端 API 端点

```yaml
# 认证
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/user

# 机器人
GET    /api/robots
GET    /api/robots/:id
POST   /api/robots/:id/acquire
POST   /api/robots/:id/execute
GET    /api/robots/public

# 执行记录
GET    /api/executions
GET    /api/executions/:id
GET    /api/executions/:id/logs
POST   /api/executions/:id/cancel

# 调度
GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
POST   /api/schedules/:id/toggle
```

---

## 十一、参考资源

### 文档
- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Fluent UI React](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [React Router](https://reactrouter.com/en/main)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Query](https://tanstack.com/query/latest)

### 示例项目
- [Tauri + React 模板](https://github.com/tauri-apps/create-tauri-app)
- [Fluent UI React 示例](https://github.com/microsoft/fluentui/tree/master/apps/public-docsite-resources)

### 相关工具
- [FFmpeg](https://ffmpeg.org/)
- [Cron Parser](https://www.npmjs.com/package/cron-parser)
- [Rust SQLite](https://github.com/rusqlite/rusqlite)

---

**创建日期**: 2026-05-31  
**版本**: v1.0.0  
**作者**: Claude Code
