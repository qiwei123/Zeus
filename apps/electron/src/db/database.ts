import { DataSource } from 'typeorm';
import { TaskFlowEntity } from './entities/TaskFlow.js';
import { ExecutionRecordEntity } from './entities/ExecutionRecord.js';

// ============================================
// SQLite 数据库配置
// ============================================

let dataSource: DataSource | null = null;

export async function initializeDatabase(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: './data/rpa.db',
    synchronize: true, // 开发环境自动同步，生产环境使用 migrations
    logging: process.env.NODE_ENV === 'development',
    entities: [TaskFlowEntity, ExecutionRecordEntity],
    migrations: [],
    subscribers: [],
  });

  await dataSource.initialize();
  console.log('[Database] SQLite database initialized at ./data/rpa.db');

  return dataSource;
}

export function getDatabase(): DataSource {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dataSource;
}

export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    console.log('[Database] Database connection closed');
  }
}
