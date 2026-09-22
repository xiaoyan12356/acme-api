/**
 * dev seed 脚本：插入 alice / secret123（bcrypt cost=12）
 *
 * SUG-4：dev seed 不入 prod
 * 脚本顶部必须 fail-fast，禁止 prod 注入
 */

import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { createConnection } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { BCRYPT_COST } from '../src/modules/auth/auth.constants';

// SUG-4：prod 注入 fail-fast
const env = process.env.NODE_ENV || process.env.APP_ENV;
if (env === 'production' || env === 'prod') {
  // eslint-disable-next-line no-console
  console.error('[FATAL] seed script forbidden in production');
  process.exit(1);
}

async function main(): Promise<void> {
  const conn = await createConnection({
    type: 'sqlite',
    database: process.env.DB_DATABASE || ':memory:',
    entities: [User],
    synchronize: true
  });

  const repo = conn.getRepository(User);
  const existing = await repo.findOne({ where: { username: 'alice' } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('[seed] alice already exists, skipping');
    await conn.close();
    return;
  }

  const password_hash = await bcrypt.hash('secret123', BCRYPT_COST);
  const alice = repo.create({ username: 'alice', password_hash, is_active: true });
  await repo.save(alice);
  // eslint-disable-next-line no-console
  console.log('[seed] inserted alice / secret123');

  await conn.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});