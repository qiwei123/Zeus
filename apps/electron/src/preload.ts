import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPCChannel, IPCRequest, IPCResponse } from '@shared/types/rpa.js';

// ============================================
// Electron 预加载脚本 (Preload Script)
// 提供安全的 IPC 通信接口给渲染进程
// ============================================

interface IPCInvokeAPI {
  invoke: <T = unknown, R = unknown>(
    channel: IPCChannel,
    payload?: T
  ) => Promise<R>;
}

interface IPCSendAPI {
  send: (channel: IPCChannel, payload?: unknown) => void;
  on: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  once: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  removeListener: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
}

// 安全的 IPC API
const ipcAPI: IPCInvokeAPI & IPCSendAPI = {
  // 异步调用 (invoke/handle 模式)
  invoke: async <T = unknown, R = unknown>(
    channel: IPCChannel,
    payload?: T
  ): Promise<R> => {
    const request: IPCRequest<T> = {
      id: generateRequestId(),
      channel,
      payload: payload as T,
      timestamp: Date.now(),
    };
    return ipcRenderer.invoke(channel, request) as Promise<R>;
  },

  // 单向发送
  send: (channel: IPCChannel, payload?: unknown): void => {
    ipcRenderer.send(channel, payload);
  },

  // 事件监听
  on: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ): void => {
    ipcRenderer.on(channel, callback);
  },

  // 一次性事件监听
  once: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ): void => {
    ipcRenderer.once(channel, callback);
  },

  // 移除监听器
  removeListener: (
    channel: IPCChannel,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ): void => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// 生成请求 ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', ipcAPI);

// 类型声明，供 TypeScript 使用
declare global {
  interface Window {
    electronAPI: typeof ipcAPI;
  }
}
