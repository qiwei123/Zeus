import { TaskStatus, } from '@shared/types/rpa.js';
import { getDatabase } from '../db/database.js';
import { TaskFlowEntity } from '../db/entities/TaskFlow.js';
import { ExecutionRecordEntity } from '../db/entities/ExecutionRecord.js';
import { BrowserEngine } from './browser/index.js';
import { DesktopEngine } from './desktop/index.js';
export class ExecutorEngine {
    executions = new Map();
    browserEngine;
    desktopEngine;
    constructor() {
        this.browserEngine = new BrowserEngine();
        this.desktopEngine = new DesktopEngine();
    }
    // ==========================================
    // 执行控制
    // ==========================================
    async startExecution(flowId, variables = {}) {
        const db = getDatabase();
        // 从数据库加载任务流
        const entity = await db.getRepository(TaskFlowEntity).findOneBy({ id: flowId });
        if (!entity) {
            throw new Error(`Task flow not found: ${flowId}`);
        }
        const flow = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            steps: JSON.parse(entity.stepsJson),
            variables: { ...JSON.parse(entity.variablesJson), ...variables },
            createdAt: new Date(entity.createdAt),
            updatedAt: new Date(entity.updatedAt),
        };
        const executionId = generateExecutionId();
        const context = {
            taskId: executionId,
            flowId: flow.id,
            variables: new Map(Object.entries(flow.variables)),
            logs: [],
            startTime: new Date(),
        };
        const abortController = new AbortController();
        const state = {
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
    pauseExecution(executionId) {
        const state = this.executions.get(executionId);
        if (!state || state.status !== TaskStatus.RUNNING) {
            throw new Error(`Execution ${executionId} is not running`);
        }
        state.status = TaskStatus.PAUSED;
        this.updateExecutionRecord(executionId, { status: TaskStatus.PAUSED });
    }
    resumeExecution(executionId) {
        const state = this.executions.get(executionId);
        if (!state || state.status !== TaskStatus.PAUSED) {
            throw new Error(`Execution ${executionId} is not paused`);
        }
        state.status = TaskStatus.RUNNING;
        this.updateExecutionRecord(executionId, { status: TaskStatus.RUNNING });
    }
    stopExecution(executionId) {
        const state = this.executions.get(executionId);
        if (!state) {
            throw new Error(`Execution not found: ${executionId}`);
        }
        state.status = TaskStatus.CANCELLED;
        state.abortController.abort();
        this.log(state, 'info', 'Execution cancelled by user');
        this.updateExecutionRecord(executionId, { status: TaskStatus.CANCELLED });
    }
    getExecutionState(executionId) {
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
    async dispose() {
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
    async executeFlow(state) {
        const { flow, abortController } = state;
        const totalSteps = flow.steps.length;
        this.log(state, 'info', `Starting execution of flow: ${flow.name}`);
        for (let i = 0; i < totalSteps; i++) {
            // 检查是否被取消或暂停
            if (abortController.signal.aborted)
                return;
            await this.waitIfPaused(state);
            state.currentStepIndex = i;
            const step = flow.steps[i];
            try {
                this.log(state, 'info', `Executing step ${i + 1}/${totalSteps}: ${step.name}`, step.id);
                await this.executeStep(state, step);
                state.progress = Math.round(((i + 1) / totalSteps) * 100);
                this.emitProgress(state);
            }
            catch (error) {
                await this.handleStepError(state, step, error);
                if (state.status === TaskStatus.FAILED)
                    break;
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
    async executeStep(state, step) {
        switch (step.type) {
            case 'browser':
                await this.browserEngine.execute(step.action, state.context);
                break;
            case 'desktop':
                await this.desktopEngine.execute(step.action, state.context);
                break;
            case 'hybrid':
                // 混合步骤先执行浏览器部分，再执行桌面部分
                await this.browserEngine.execute(step.action, state.context);
                await this.desktopEngine.execute(step.action, state.context);
                break;
        }
    }
    async handleStepError(state, step, error) {
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
                    }
                    catch {
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
                    const gotoIndex = state.flow.steps.findIndex((s) => s.id === step.onError.gotoStep);
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
    handleExecutionError(state, error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(state, 'error', `Execution failed: ${errorMessage}`);
        state.status = TaskStatus.FAILED;
        this.updateExecutionRecord(state.executionId, {
            status: TaskStatus.FAILED,
            endTime: new Date().toISOString(),
        });
    }
    waitIfPaused(state) {
        return new Promise((resolve) => {
            const check = () => {
                if (state.status === TaskStatus.CANCELLED)
                    resolve();
                else if (state.status === TaskStatus.RUNNING)
                    resolve();
                else
                    setTimeout(check, 200);
            };
            check();
        });
    }
    // ==========================================
    // 日志与进度
    // ==========================================
    log(state, level, message, stepId) {
        const logEntry = {
            id: generateLogId(),
            timestamp: new Date(),
            level,
            message,
            stepId,
        };
        state.context.logs.push(logEntry);
        console.log(`[${level.toUpperCase()}] [${state.executionId}] ${message}`);
    }
    emitProgress(state) {
        // 实际项目中通过 IPC 推送进度
        const { MainProcess } = require('electron');
        // 预留进度推送接口
    }
    // ==========================================
    // 数据库操作
    // ==========================================
    async updateExecutionRecord(executionId, updates) {
        try {
            const db = getDatabase();
            const state = this.executions.get(executionId);
            if (state) {
                updates.logsJson = JSON.stringify(state.context.logs);
            }
            await db.getRepository(ExecutionRecordEntity).update({ id: executionId }, updates);
        }
        catch (error) {
            console.error('[Executor] Failed to update execution record:', error);
        }
    }
    // ==========================================
    // 工具方法
    // ==========================================
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
function generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
//# sourceMappingURL=executor.js.map