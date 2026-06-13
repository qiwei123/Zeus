var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
// ============================================
// 执行记录实体 - 存储每次任务执行的日志和结果
// ============================================
let ExecutionRecordEntity = (() => {
    let _classDecorators = [Entity('execution_records')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _flowId_decorators;
    let _flowId_initializers = [];
    let _flowId_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _startTime_decorators;
    let _startTime_initializers = [];
    let _startTime_extraInitializers = [];
    let _endTime_decorators;
    let _endTime_initializers = [];
    let _endTime_extraInitializers = [];
    let _logsJson_decorators;
    let _logsJson_initializers = [];
    let _logsJson_extraInitializers = [];
    let _resultJson_decorators;
    let _resultJson_initializers = [];
    let _resultJson_extraInitializers = [];
    var ExecutionRecordEntity = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [PrimaryColumn('text')];
            _flowId_decorators = [Index(), Column('text', { name: 'flow_id' })];
            _status_decorators = [Column('text')];
            _startTime_decorators = [CreateDateColumn({ name: 'start_time' })];
            _endTime_decorators = [Column('text', { name: 'end_time', nullable: true })];
            _logsJson_decorators = [Column('text', { name: 'logs_json' })];
            _resultJson_decorators = [Column('text', { name: 'result_json', nullable: true })];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _flowId_decorators, { kind: "field", name: "flowId", static: false, private: false, access: { has: obj => "flowId" in obj, get: obj => obj.flowId, set: (obj, value) => { obj.flowId = value; } }, metadata: _metadata }, _flowId_initializers, _flowId_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _startTime_decorators, { kind: "field", name: "startTime", static: false, private: false, access: { has: obj => "startTime" in obj, get: obj => obj.startTime, set: (obj, value) => { obj.startTime = value; } }, metadata: _metadata }, _startTime_initializers, _startTime_extraInitializers);
            __esDecorate(null, null, _endTime_decorators, { kind: "field", name: "endTime", static: false, private: false, access: { has: obj => "endTime" in obj, get: obj => obj.endTime, set: (obj, value) => { obj.endTime = value; } }, metadata: _metadata }, _endTime_initializers, _endTime_extraInitializers);
            __esDecorate(null, null, _logsJson_decorators, { kind: "field", name: "logsJson", static: false, private: false, access: { has: obj => "logsJson" in obj, get: obj => obj.logsJson, set: (obj, value) => { obj.logsJson = value; } }, metadata: _metadata }, _logsJson_initializers, _logsJson_extraInitializers);
            __esDecorate(null, null, _resultJson_decorators, { kind: "field", name: "resultJson", static: false, private: false, access: { has: obj => "resultJson" in obj, get: obj => obj.resultJson, set: (obj, value) => { obj.resultJson = value; } }, metadata: _metadata }, _resultJson_initializers, _resultJson_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ExecutionRecordEntity = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        id = __runInitializers(this, _id_initializers, void 0);
        flowId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _flowId_initializers, void 0));
        status = (__runInitializers(this, _flowId_extraInitializers), __runInitializers(this, _status_initializers, void 0)); // pending, running, completed, failed, cancelled
        startTime = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _startTime_initializers, void 0));
        endTime = (__runInitializers(this, _startTime_extraInitializers), __runInitializers(this, _endTime_initializers, void 0));
        // 执行日志的 JSON 字符串数组
        logsJson = (__runInitializers(this, _endTime_extraInitializers), __runInitializers(this, _logsJson_initializers, void 0));
        // 执行结果的 JSON 字符串
        resultJson = (__runInitializers(this, _logsJson_extraInitializers), __runInitializers(this, _resultJson_initializers, void 0));
        constructor() {
            __runInitializers(this, _resultJson_extraInitializers);
        }
    };
    return ExecutionRecordEntity = _classThis;
})();
export { ExecutionRecordEntity };
//# sourceMappingURL=ExecutionRecord.js.map