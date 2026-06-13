// ============================================
// RPA 共享类型定义 - 前后端通用
// ============================================
// -------------------------------------------
// 任务类型定义
// -------------------------------------------
export var TaskType;
(function (TaskType) {
    TaskType["BROWSER"] = "browser";
    TaskType["DESKTOP"] = "desktop";
    TaskType["HYBRID"] = "hybrid";
})(TaskType || (TaskType = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["PAUSED"] = "paused";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (TaskStatus = {}));
export var BrowserActionType;
(function (BrowserActionType) {
    BrowserActionType["GOTO"] = "goto";
    BrowserActionType["CLICK"] = "click";
    BrowserActionType["TYPE"] = "type";
    BrowserActionType["SELECT"] = "select";
    BrowserActionType["SCROLL"] = "scroll";
    BrowserActionType["SCREENSHOT"] = "screenshot";
    BrowserActionType["GET_TEXT"] = "getText";
    BrowserActionType["GET_ATTRIBUTE"] = "getAttribute";
    BrowserActionType["WAIT_FOR_SELECTOR"] = "waitForSelector";
    BrowserActionType["WAIT_FOR_NAVIGATION"] = "waitForNavigation";
    BrowserActionType["EVALUATE"] = "evaluate";
    BrowserActionType["DOWNLOAD"] = "download";
    BrowserActionType["UPLOAD"] = "upload";
})(BrowserActionType || (BrowserActionType = {}));
export var DesktopActionType;
(function (DesktopActionType) {
    DesktopActionType["CLICK"] = "click";
    DesktopActionType["RIGHT_CLICK"] = "rightClick";
    DesktopActionType["DOUBLE_CLICK"] = "doubleClick";
    DesktopActionType["DRAG"] = "drag";
    DesktopActionType["TYPE"] = "type";
    DesktopActionType["HOTKEY"] = "hotkey";
    DesktopActionType["SCROLL"] = "scroll";
    DesktopActionType["FIND_WINDOW"] = "findWindow";
    DesktopActionType["ACTIVATE_WINDOW"] = "activateWindow";
    DesktopActionType["GET_WINDOW_RECT"] = "getWindowRect";
    DesktopActionType["TAKE_SCREENSHOT"] = "takeScreenshot";
    DesktopActionType["FIND_IMAGE"] = "findImage";
    DesktopActionType["WAIT_FOR_IMAGE"] = "waitForImage";
    DesktopActionType["GET_ELEMENT_PROPERTY"] = "getElementProperty";
})(DesktopActionType || (DesktopActionType = {}));
// -------------------------------------------
// IPC 通信契约
// -------------------------------------------
export var IPCChannel;
(function (IPCChannel) {
    // 任务管理
    IPCChannel["TASK_CREATE"] = "task:create";
    IPCChannel["TASK_START"] = "task:start";
    IPCChannel["TASK_PAUSE"] = "task:pause";
    IPCChannel["TASK_RESUME"] = "task:resume";
    IPCChannel["TASK_STOP"] = "task:stop";
    IPCChannel["TASK_GET_STATUS"] = "task:getStatus";
    IPCChannel["TASK_GET_LIST"] = "task:getList";
    IPCChannel["TASK_DELETE"] = "task:delete";
    // 执行控制
    IPCChannel["EXECUTION_START"] = "execution:start";
    IPCChannel["EXECUTION_STOP"] = "execution:stop";
    IPCChannel["EXECUTION_PAUSE"] = "execution:pause";
    IPCChannel["EXECUTION_RESUME"] = "execution:resume";
    IPCChannel["EXECUTION_GET_STATE"] = "execution:getState";
    // 日志与事件
    IPCChannel["LOG_STREAM"] = "log:stream";
    IPCChannel["PROGRESS_UPDATE"] = "progress:update";
    IPCChannel["STEP_COMPLETE"] = "step:complete";
    IPCChannel["EXECUTION_COMPLETE"] = "execution:complete";
    // 数据持久化
    IPCChannel["DB_QUERY"] = "db:query";
    IPCChannel["DB_SAVE_FLOW"] = "db:saveFlow";
    IPCChannel["DB_GET_FLOWS"] = "db:getFlows";
    IPCChannel["DB_DELETE_FLOW"] = "db:deleteFlow";
})(IPCChannel || (IPCChannel = {}));
//# sourceMappingURL=rpa.js.map