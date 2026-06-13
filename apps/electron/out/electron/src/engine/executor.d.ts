import { TaskStatus } from '@shared/types/rpa.js';
export declare class ExecutorEngine {
    private executions;
    private browserEngine;
    private desktopEngine;
    constructor();
    startExecution(flowId: string, variables?: Record<string, unknown>): Promise<string>;
    pauseExecution(executionId: string): void;
    resumeExecution(executionId: string): void;
    stopExecution(executionId: string): void;
    getExecutionState(executionId: string): {
        status: TaskStatus;
        currentStep?: string;
        progress: number;
    };
    dispose(): Promise<void>;
    private executeFlow;
    private executeStep;
    private handleStepError;
    private handleExecutionError;
    private waitIfPaused;
    private log;
    private emitProgress;
    private updateExecutionRecord;
    private sleep;
}
//# sourceMappingURL=executor.d.ts.map