import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIPCHandlers } from './ipc/handler.js';
import { initializeDatabase } from './db/database.js';
import { ExecutorEngine } from './engine/executor.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ============================================
// Electron 主进程入口
// ============================================
class RPAMain {
    mainWindow = null;
    executor;
    constructor() {
        this.executor = new ExecutorEngine();
    }
    async initialize() {
        // 等待 Electron 应用就绪
        await app.whenReady();
        // 初始化数据库
        await this.initializeDatabase();
        // 注册 IPC 处理器
        registerIPCHandlers();
        // 创建主窗口
        await this.createMainWindow();
        // 应用事件监听
        this.setupAppEvents();
        console.log('[RPA] Application initialized successfully');
    }
    async initializeDatabase() {
        try {
            await initializeDatabase();
            console.log('[RPA] Database initialized');
        }
        catch (error) {
            console.error('[RPA] Failed to initialize database:', error);
            throw error;
        }
    }
    async createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1200,
            minHeight: 700,
            title: 'Windows RPA Robot',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
            show: false,
            titleBarStyle: 'hiddenInset',
        });
        // 开发环境加载 Vite 开发服务器
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            await this.mainWindow.loadURL('http://localhost:5173');
            this.mainWindow.webContents.openDevTools();
        }
        else {
            await this.mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
        }
        // 窗口加载完成后再显示
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });
        // 处理窗口关闭
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }
    setupAppEvents() {
        // macOS: 点击 dock 图标重新创建窗口
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createMainWindow();
            }
        });
        // 所有窗口关闭时退出（Windows/Linux）
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
        // 应用退出前清理资源
        app.on('before-quit', async () => {
            console.log('[RPA] Cleaning up before quit...');
            await this.executor.dispose();
        });
    }
    getMainWindow() {
        return this.mainWindow;
    }
}
// 启动应用
const rpaMain = new RPAMain();
rpaMain.initialize().catch((error) => {
    console.error('[RPA] Failed to start application:', error);
    process.exit(1);
});
export { rpaMain };
//# sourceMappingURL=main.js.map