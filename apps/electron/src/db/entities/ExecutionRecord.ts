import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// ============================================
// 执行记录实体 - 存储每次任务执行的日志和结果
// ============================================

@Entity('execution_records')
export class ExecutionRecordEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text', { name: 'flow_id' })
  flowId!: string;

  @Column('text')
  status!: string; // pending, running, completed, failed, cancelled

  @CreateDateColumn({ name: 'start_time' })
  startTime!: string;

  @Column('text', { name: 'end_time', nullable: true })
  endTime?: string;

  // 执行日志的 JSON 字符串数组
  @Column('text', { name: 'logs_json' })
  logsJson!: string;

  // 执行结果的 JSON 字符串
  @Column('text', { name: 'result_json', nullable: true })
  resultJson?: string;
}
