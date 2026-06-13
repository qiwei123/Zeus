import { DesktopAction, ExecutionContext } from '@shared/types/rpa.js';

// ============================================
// 桌面自动化引擎 - nut-js + edge-js UIA 封装
// ============================================

export class DesktopEngine {
  async execute(action: DesktopAction, _context: ExecutionContext): Promise<void> {
    console.log(`[DesktopEngine] Executing: ${action.type}`, action.params);
    // TODO: 实现桌面自动化操作
    // Layer 1: @nut-tree/nut-js — 图像识别 + 键鼠模拟
    // Layer 2: edge-js → C# UIA Worker — 控件树解析
  }

  async dispose(): Promise<void> {
    console.log('[DesktopEngine] Disposed');
    // TODO: 关闭 edge-js 连接
  }
}
