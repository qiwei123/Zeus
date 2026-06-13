import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// ============================================
// 任务流实体 - 存储用户定义的任务流程
// ============================================

@Entity('task_flows')
export class TaskFlowEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  description!: string;

  // 步骤数组的 JSON 字符串
  @Column('text', { name: 'steps_json' })
  stepsJson!: string;

  // 变量定义的 JSON 字符串
  @Column('text', { name: 'variables_json' })
  variablesJson!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: string;
}
