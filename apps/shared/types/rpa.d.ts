export declare enum TaskType {
    BROWSER = "browser",
    DESKTOP = "desktop",
    HYBRID = "hybrid"
}
export declare enum TaskStatus {
    PENDING = "pending",
    RUNNING = "running",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface BrowserConfig {
    type: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    proxy?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
}
export interface BrowserAction {
    id: string;
    type: BrowserActionType;
    params: Record<string, unknown>;
    timeout?: number;
    retry?: number;
}
export declare enum BrowserActionType {
    GOTO = "goto",
    CLICK = "click",
    TYPE = "type",
    SELECT = "select",
    SCROLL = "scroll",
    SCREENSHOT = "screenshot",
    GET_TEXT = "getText",
    GET_ATTRIBUTE = "getAttribute",
    WAIT_FOR_SELECTOR = "waitForSelector",
    WAIT_FOR_NAVIGATION = "waitForNavigation",
    EVALUATE = "evaluate",
    DOWNLOAD = "download",
    UPLOAD = "upload"
}
export interface DesktopConfig {
    useImageRecognition: boolean;
    useUIA: boolean;
    confidenceThreshold: number;
}
export interface DesktopAction {
    id: string;
    type: DesktopActionType;
    params: Record<string, unknown>;
    timeout?: number;
    retry?: number;
}
export declare enum DesktopActionType {
    CLICK = "click",
    RIGHT_CLICK = "rightClick",
    DOUBLE_CLICK = "doubleClick",
    DRAG = "drag",
    TYPE = "type",
    HOTKEY = "hotkey",
    SCROLL = "scroll",
    FIND_WINDOW = "findWindow",
    ACTIVATE_WINDOW = "activateWindow",
    GET_WINDOW_RECT = "getWindowRect",
    TAKE_SCREENSHOT = "takeScreenshot",
    FIND_IMAGE = "findImage",
    WAIT_FOR_IMAGE = "waitForImage",
    GET_ELEMENT_PROPERTY = "getElementProperty"
}
export interface TaskFlow {
    id: string;
    name: string;
    description?: string;
    steps: TaskStep[];
    variables: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface TaskStep {
    id: string;
    name: string;
    type: TaskType;
    action: BrowserAction | DesktopAction;
    condition?: StepCondition;
    onError?: ErrorHandler;
    next?: string;
}
export interface StepCondition {
    type: 'equals' | 'contains' | 'regex' | 'exists' | 'custom';
    variable: string;
    value?: unknown;
    expression?: string;
}
export interface ErrorHandler {
    action: 'retry' | 'skip' | 'stop' | 'goto';
    maxRetries?: number;
    gotoStep?: string;
}
export interface ExecutionContext {
    taskId: string;
    flowId: string;
    variables: Map<string, unknown>;
    browserSession?: BrowserSession;
    desktopSession?: DesktopSession;
    logs: ExecutionLog[];
    startTime: Date;
    currentStep?: string;
}
export interface BrowserSession {
    browserId: string;
    pageId: string;
    config: BrowserConfig;
}
export interface DesktopSession {
    sessionId: string;
    activeWindow?: string;
    config: DesktopConfig;
}
export interface ExecutionLog {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    stepId?: string;
    screenshot?: string;
    metadata?: Record<string, unknown>;
}
export declare enum IPCChannel {
    TASK_CREATE = "task:create",
    TASK_START = "task:start",
    TASK_PAUSE = "task:pause",
    TASK_RESUME = "task:resume",
    TASK_STOP = "task:stop",
    TASK_GET_STATUS = "task:getStatus",
    TASK_GET_LIST = "task:getList",
    TASK_DELETE = "task:delete",
    EXECUTION_START = "execution:start",
    EXECUTION_STOP = "execution:stop",
    EXECUTION_PAUSE = "execution:pause",
    EXECUTION_RESUME = "execution:resume",
    EXECUTION_GET_STATE = "execution:getState",
    LOG_STREAM = "log:stream",
    PROGRESS_UPDATE = "progress:update",
    STEP_COMPLETE = "step:complete",
    EXECUTION_COMPLETE = "execution:complete",
    DB_QUERY = "db:query",
    DB_SAVE_FLOW = "db:saveFlow",
    DB_GET_FLOWS = "db:getFlows",
    DB_DELETE_FLOW = "db:deleteFlow"
}
export interface IPCRequest<T = unknown> {
    id: string;
    channel: IPCChannel;
    payload: T;
    timestamp: number;
}
export interface IPCResponse<T = unknown> {
    id: string;
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
export interface TaskFlowEntity {
    id: string;
    name: string;
    description: string;
    stepsJson: string;
    variablesJson: string;
    createdAt: string;
    updatedAt: string;
}
export interface ExecutionRecordEntity {
    id: string;
    flowId: string;
    status: TaskStatus;
    startTime: string;
    endTime?: string;
    logsJson: string;
    resultJson?: string;
}
export interface DashboardStats {
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
}
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    taskName?: string;
    stepName?: string;
}
export interface TaskCardProps {
    id: string;
    name: string;
    description?: string;
    status: TaskStatus;
    lastRun?: Date;
    onRun: () => void;
    onEdit: () => void;
    onDelete: () => void;
}
//# sourceMappingURL=rpa.d.ts.map