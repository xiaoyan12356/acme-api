/**
 * 一次性 migration runner（生产路径 / PG 用）
 * dev 路径（sqlite）由 scripts/seed.ts 的 synchronize:true 自建表（无 migration 依赖）
 *
 * 用法：
 *   npm run migrate
 * 退出码：0 = OK；非 0 = 失败（stderr 详情）
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/user.entity';
import { AddPasswordAndActive1700000000000 } from './1700000000000-AddPasswordAndActive';

async function main(): Promise<void> {
  const ds = new DataSource({
    type: (process.env.DB_TYPE as 'sqlite') || 'sqlite',
    database: process.env.DB_DATABASE || ':memory:',
    entities: [User],
    migrations: [AddPasswordAndActive1700000000000],
    synchronize: false
  });

  await ds.initialize();
  // eslint-disable-next-line no-console
  console.log('[migrate] data source initialized');

  const ran = await ds.runMigrations({ transaction: 'each' });
  if (ran.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[migrate] no pending migrations');
  } else {
    // eslint-disable-next-line no-console
    console.log(`[migrate] applied ${ran.length} migration(s):`);
    for (const m of ran) {
      // eslint-disable-next-line no-console
      console.log(`  - ${m.name}`);
    }
  }

  await ds.destroy();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] failed:', err);
  process.exit(1);
});