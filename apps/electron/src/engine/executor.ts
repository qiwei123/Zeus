import { DataSource } from 'typeorm';
import {
  TaskFlow,
  TaskStep,
  TaskStatus,
  ExecutionContext,
  ExecutionLog,
  BrowserAction,
  DesktopAction,
} from '@shared/types/rpa.js';
import { getDatabase } from '../db/database.js';
import { TaskFlowEntity } from '../db/entities/TaskFlow.js';
import { ExecutionRecordEntity } from '../db/entities/ExecutionRecord.js';
import { BrowserEngine } from './browser/index.js';
import { DesktopEngine } from './desktop/index.js';

// ============================================
// 任务流执行器 (状态机)
// ============================================

interface ExecutionState {
  executionId: string;
  flowId: string;
  flow: TaskFlow;
  context: ExecutionContext;
  status: TaskStatus;
  currentStepIndex: number;
  progress: number;
  abortController: AbortController;
}

export class ExecutorEngine {
  private executions: Map<string, ExecutionState> = new Map();
  private browserEngine: BrowserEngine;
  private desktopEngine: DesktopEngine;

  constructor() {
    this.browserEngine = new BrowserEngine();
    this.desktopEngine = new DesktopEngine();
  }

  // ==========================================
  // 执行控制
  // ==========================================

  async startExecution(
    flowId: string,
    variables: Record<string, unknown> = {}
  ): Promise<string> {
    const db = getDatabase();

    // 从数据库加载任务流
    const entity = await db.getRepository(TaskFlowEntity).findOneBy({ id: flowId });
    if (!entity) {
      throw new Error(`Task flow not found: ${flowId}`);
    }

    const flow: TaskFlow = {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      steps: JSON.parse(entity.stepsJson),
      variables: { ...JSON.parse(entity.variablesJson), ...variables },
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    };

    const executionId = generateExecutionId();

    const context: ExecutionContext = {
      taskId: executionId,
      flowId: flow.id,
      variables: new Map(Object.entries(flow.variables)),
      logs: [],
      startTime: new Date(),
    };

    const abortController = new AbortController();

    const state: ExecutionState = {
      executionId,
      flowId: flow.id,
      flow,
      context,
      status: TaskStatus.RUNNING,
      currentStepIndex: 0,
      progress: 0,
      abortController,
    };

    this.executions.set(executionId, state);

    // 保存执行记录
    await db.getRepository(ExecutionRecordEntity).save({
      id: executionId,
      flowId: flow.id,
      status: TaskStatus.RUNNING,
      startTime: new Date().toISOString(),
      logsJson: '[]',
    });

    // 异步执行任务流
    this.executeFlow(state).catch((error) => {
      this.handleExecutionError(state, error);
    });

    return executionId;
  }

  pauseExecution(executionId: string): void {
    const state = this.executions.get(executionId);
    if (!state || state.status !== TaskStatus.RUNNING) {
      throw new Error(`Execution ${executionId} is not running`);
    }
    state.status = TaskStatus.PAUSED;
    this.updateExecutionRecord(executionId, { status: TaskStatus.PAUSED });
  }

  resumeExecution(executionId: string): void {
    const state = this.executions.get(executionId);
    if (!state || state.status !== TaskStatus.PAUSED) {
      throw new Error(`Execution ${executionId} is not paused`);
    }
    state.status = TaskStatus.RUNNING;
    this.updateExecutionRecord(executionId, { status: TaskStatus.RUNNING });
  }

  stopExecution(executionId: string): void {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    state.status = TaskStatus.CANCELLED;
    state.abortController.abort();
    this.log(state, 'info', 'Execution cancelled by user');
    this.updateExecutionRecord(executionId, { status: TaskStatus.CANCELLED });
  }

  getExecutionState(executionId: string): {
    status: TaskStatus;
    currentStep?: string;
    progress: number;
  } {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    return {
      status: state.status,
      currentStep: state.flow.steps[state.currentStepIndex]?.name,
      progress: state.progress,
    };
  }

  async dispose(): Promise<void> {
    // 停止所有执行
    for (const [id, state] of this.executions) {
      state.abortController.abort();
    }
    this.executions.clear();

    // 关闭引擎
    await this.browserEngine.dispose();
    await this.desktopEngine.dispose();
  }

  // ==========================================
  // 内部执行逻辑
  // ==========================================

  private async executeFlow(state: ExecutionState): Promise<void> {
    const { flow, abortController } = state;
    const totalSteps = flow.steps.length;

    this.log(state, 'info', `Starting execution of flow: ${flow.name}`);

    for (let i = 0; i < totalSteps; i++) {
      // 检查是否被取消或暂停
      if (abortController.signal.aborted) return;
      await this.waitIfPaused(state);

      state.currentStepIndex = i;
      const step = flow.steps[i];

      try {
        this.log(state, 'info', `Executing step ${i + 1}/${totalSteps}: ${step.name}`, step.id);
        await this.executeStep(state, step);

        state.progress = Math.round(((i + 1) / totalSteps) * 100);
        this.emitProgress(state);
      } catch (error) {
        await this.handleStepError(state, step, error);
        if (state.status === TaskStatus.FAILED) break;
      }
    }

    // 执行完成
    if (state.status === TaskStatus.RUNNING) {
      state.status = TaskStatus.COMPLETED;
      state.progress = 100;
      this.log(state, 'info', 'Execution completed successfully');
      this.updateExecutionRecord(state.executionId, {
        status: TaskStatus.COMPLETED,
        endTime: new Date().toISOString(),
      });
    }
  }

  private async executeStep(state: ExecutionState, step: TaskStep): Promise<void> {
    switch (step.type) {
      case 'browser':
        await this.browserEngine.execute(step.action as BrowserAction, state.context);
        break;
      case 'desktop':
        await this.desktopEngine.execute(step.action as DesktopAction, state.context);
        break;
      case 'hybrid':
        // 混合步骤先执行浏览器部分，再执行桌面部分
        await this.browserEngine.execute(step.action as BrowserAction, state.context);
        await this.desktopEngine.execute(step.action as DesktopAction, state.context);
        break;
    }
  }

  private async handleStepError(
    state: ExecutionState,
    step: TaskStep,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.log(state, 'error', `Step "${step.name}" failed: ${errorMessage}`, step.id);

    if (!step.onError) {
      state.status = TaskStatus.FAILED;
      this.updateExecutionRecord(state.executionId, {
        status: TaskStatus.FAILED,
        endTime: new Date().toISOString(),
      });
      return;
    }

    switch (step.onError.action) {
      case 'retry': {
        const maxRetries = step.onError.maxRetries ?? 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          this.log(state, 'warn', `Retrying step (${attempt}/${maxRetries})`, step.id);
          await this.sleep(1000);
          try {
            await this.executeStep(state, step);
            this.log(state, 'info', `Step recovered on retry ${attempt}`, step.id);
            return;
          } catch {
            // retry loop continues
          }
        }
        state.status = TaskStatus.FAILED;
        break;
      }
      case 'skip':
        this.log(state, 'warn', `Skipping failed step: ${step.name}`, step.id);
        return;
      case 'stop':
        state.status = TaskStatus.FAILED;
        break;
      case 'goto':
        if (step.onError.gotoStep) {
          const gotoIndex = state.flow.steps.findIndex((s) => s.id === step.onError!.gotoStep);
          if (gotoIndex >= 0) {
            state.currentStepIndex = gotoIndex - 1; // +1 in loop
            return;
          }
        }
        state.status = TaskStatus.FAILED;
        break;
    }

    this.updateExecutionRecord(state.executionId, {
      status: TaskStatus.FAILED,
      endTime: new Date().toISOString(),
    });
  }

  private handleExecutionError(state: ExecutionState, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.log(state, 'error', `Execution failed: ${errorMessage}`);
    state.status = TaskStatus.FAILED;
    this.updateExecutionRecord(state.executionId, {
      status: TaskStatus.FAILED,
      endTime: new Date().toISOString(),
    });
  }

  private waitIfPaused(state: ExecutionState): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (state.status === TaskStatus.CANCELLED) resolve();
        else if (state.status === TaskStatus.RUNNING) resolve();
        else setTimeout(check, 200);
      };
      check();
    });
  }

  // ==========================================
  // 日志与进度
  // ==========================================

  private log(state: ExecutionState, level: ExecutionLog['level'], message: string, stepId?: string): void {
    const logEntry: ExecutionLog = {
      id: generateLogId(),
      timestamp: new Date(),
      level,
      message,
      stepId,
    };
    state.context.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] [${state.executionId}] ${message}`);
  }

  private emitProgress(state: ExecutionState): void {
    // 实际项目中通过 IPC 推送进度
    const { MainProcess } = require('electron');
    // 预留进度推送接口
  }

  // ==========================================
  // 数据库操作
  // ==========================================

  private async updateExecutionRecord(
    executionId: string,
    updates: Partial<{
      status: TaskStatus;
      endTime: string;
      logsJson: string;
      resultJson: string;
    }>
  ): Promise<void> {
    try {
      const db = getDatabase();
      const state = this.executions.get(executionId);
      if (state) {
        updates.logsJson = JSON.stringify(state.context.logs);
      }
      await db.getRepository(ExecutionRecordEntity).update({ id: executionId }, updates);
    } catch (error) {
      console.error('[Executor] Failed to update execution record:', error);
    }
  }

  // ==========================================
  // 工具方法
  // ==========================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
