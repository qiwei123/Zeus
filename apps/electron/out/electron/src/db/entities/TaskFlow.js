var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// ============================================
// 任务流实体 - 存储用户定义的任务流程
// ============================================
let TaskFlowEntity = class TaskFlowEntity {
    id;
    name;
    description;
    // 步骤数组的 JSON 字符串
    stepsJson;
    // 变量定义的 JSON 字符串
    variablesJson;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryColumn('text'),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "id", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "name", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "description", void 0);
__decorate([
    Column('text', { name: 'steps_json' }),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "stepsJson", void 0);
__decorate([
    Column('text', { name: 'variables_json' }),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "variablesJson", void 0);
__decorate([
    CreateDateColumn({ name: 'created_at' }),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({ name: 'updated_at' }),
    __metadata("design:type", String)
], TaskFlowEntity.prototype, "updatedAt", void 0);
TaskFlowEntity = __decorate([
    Entity('task_flows')
], TaskFlowEntity);
export { TaskFlowEntity };
//# sourceMappingURL=TaskFlow.js.map