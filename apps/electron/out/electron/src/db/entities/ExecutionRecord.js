var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
// ============================================
// 执行记录实体 - 存储每次任务执行的日志和结果
// ============================================
let ExecutionRecordEntity = class ExecutionRecordEntity {
    id;
    flowId;
    status; // pending, running, completed, failed, cancelled
    startTime;
    endTime;
    // 执行日志的 JSON 字符串数组
    logsJson;
    // 执行结果的 JSON 字符串
    resultJson;
};
__decorate([
    PrimaryColumn('text'),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "id", void 0);
__decorate([
    Index(),
    Column('text', { name: 'flow_id' }),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "flowId", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "status", void 0);
__decorate([
    CreateDateColumn({ name: 'start_time' }),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "startTime", void 0);
__decorate([
    Column('text', { name: 'end_time', nullable: true }),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "endTime", void 0);
__decorate([
    Column('text', { name: 'logs_json' }),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "logsJson", void 0);
__decorate([
    Column('text', { name: 'result_json', nullable: true }),
    __metadata("design:type", String)
], ExecutionRecordEntity.prototype, "resultJson", void 0);
ExecutionRecordEntity = __decorate([
    Entity('execution_records')
], ExecutionRecordEntity);
export { ExecutionRecordEntity };
//# sourceMappingURL=ExecutionRecord.js.map