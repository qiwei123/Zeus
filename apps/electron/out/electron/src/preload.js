import { contextBridge, ipcRenderer } from 'electron';
// 安全的 IPC API
const ipcAPI = {
    // 异步调用 (invoke/handle 模式)
    invoke: async (channel, payload) => {
        const request = {
            id: generateRequestId(),
            channel,
            payload: payload,
            timestamp: Date.now(),
        };
        return ipcRenderer.invoke(channel, request);
    },
    // 单向发送
    send: (channel, payload) => {
        ipcRenderer.send(channel, payload);
    },
    // 事件监听
    on: (channel, callback) => {
        ipcRenderer.on(channel, callback);
    },
    // 一次性事件监听
    once: (channel, callback) => {
        ipcRenderer.once(channel, callback);
    },
    // 移除监听器
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },
};
// 生成请求 ID
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', ipcAPI);
//# sourceMappingURL=preload.js.map