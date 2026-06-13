import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { DataSource } from 'typeorm';
import {
  IPCChannel,
  IPCRequest,
  IPCResponse,
  TaskFlow,
  TaskStatus,
  ExecutionLog,
} from '@shared/types/rpa.js';
import { getDatabase } from '../db/database.js';
import { TaskFlowEntity } from '../db/entities/TaskFlow.js';
import { ExecutionRecordEntity } from '../db/entities/ExecutionRecord.js';
import { ExecutorEngine } from '../engine/executor.js';

// ============================================
// IPC 通信处理器
// 处理渲染进程发来的请求
// ============================================

const executor = new ExecutorEngine();

export function registerIPCHandlers(): void {
  // ==========================================
  // 任务管理相关
  // ==========================================

  // 创建任务流
  ipcMain.handle(
    IPCChannel.TASK_CREATE,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<TaskFlow>
    ): Promise<IPCResponse<TaskFlow>> => {
      try {
        const db = getDatabase();
        const flow = request.payload;

        const entity = db.getRepository(TaskFlowEntity).create({
          id: flow.id,
          name: flow.name,
          description: flow.description || '',
          stepsJson: JSON.stringify(flow.steps),
          variablesJson: JSON.stringify(flow.variables),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await db.getRepository(TaskFlowEntity).save(entity);

        return { id: request.id, success: true, data: flow, timestamp: Date.now() };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 启动任务
  ipcMain.handle(
    IPCChannel.TASK_START,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ flowId: string; variables?: Record<string, unknown> }>
    ): Promise<IPCResponse<{ executionId: string; status: TaskStatus }>> => {
      try {
        const { flowId, variables = {} } = request.payload;
        const executionId = await executor.startExecution(flowId, variables);

        return {
          id: request.id,
          success: true,
          data: { executionId, status: TaskStatus.RUNNING },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 暂停任务
  ipcMain.handle(
    IPCChannel.TASK_PAUSE,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ executionId: string }>
    ): Promise<IPCResponse<{ status: TaskStatus }>> => {
      try {
        const { executionId } = request.payload;
        await executor.pauseExecution(executionId);

        return {
          id: request.id,
          success: true,
          data: { status: TaskStatus.PAUSED },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 恢复任务
  ipcMain.handle(
    IPCChannel.TASK_RESUME,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ executionId: string }>
    ): Promise<IPCResponse<{ status: TaskStatus }>> => {
      try {
        const { executionId } = request.payload;
        await executor.resumeExecution(executionId);

        return {
          id: request.id,
          success: true,
          data: { status: TaskStatus.RUNNING },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 停止任务
  ipcMain.handle(
    IPCChannel.TASK_STOP,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ executionId: string }>
    ): Promise<IPCResponse<{ status: TaskStatus }>> => {
      try {
        const { executionId } = request.payload;
        await executor.stopExecution(executionId);

        return {
          id: request.id,
          success: true,
          data: { status: TaskStatus.CANCELLED },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 获取任务列表
  ipcMain.handle(
    IPCChannel.TASK_GET_LIST,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<void>
    ): Promise<IPCResponse<TaskFlow[]>> => {
      try {
        const db = getDatabase();
        const entities = await db.getRepository(TaskFlowEntity).find({
          order: { createdAt: 'DESC' },
        });

        const flows: TaskFlow[] = entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          description: entity.description,
          steps: JSON.parse(entity.stepsJson),
          variables: JSON.parse(entity.variablesJson),
          createdAt: new Date(entity.createdAt),
          updatedAt: new Date(entity.updatedAt),
        }));

        return { id: request.id, success: true, data: flows, timestamp: Date.now() };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // 删除任务
  ipcMain.handle(
    IPCChannel.TASK_DELETE,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ flowId: string }>
    ): Promise<IPCResponse<void>> => {
      try {
        const db = getDatabase();
        const { flowId } = request.payload;

        await db.getRepository(TaskFlowEntity).delete({ id: flowId });

        return { id: request.id, success: true, timestamp: Date.now() };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  // ==========================================
  // 执行状态相关
  // ==========================================

  // 获取执行状态
  ipcMain.handle(
    IPCChannel.EXECUTION_GET_STATE,
    async (
      _event: IpcMainInvokeEvent,
      request: IPCRequest<{ executionId: string }>
    ): Promise<IPCResponse<{ status: TaskStatus; currentStep?: string; progress: number }>> => {
      try {
        const { executionId } = request.payload;
        const state = executor.getExecutionState(executionId);

        return {
          id: request.id,
          success: true,
          data: state,
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    }
  );

  console.log('[IPC] Handlers registered successfully');
}
