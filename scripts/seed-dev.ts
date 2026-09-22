/**
 * dev seed 脚本（XIAO-57 T3 部署）：插入 alice + bob_disabled 到 ./data/dev.sqlite
 * 与 scripts/seed.ts 不同：dev.sqlite 持久化；幂等（已存在则跳过）。
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { createConnection } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { BCRYPT_COST } from '../src/modules/auth/auth.constants';

async function main(): Promise<void> {
  const dbPath = process.env.DB_DATABASE || './data/dev.sqlite';
  console.log('[seed-dev] dbPath =', dbPath);

  const conn = await createConnection({
    type: 'sqlite',
    database: dbPath,
    entities: [User],
    synchronize: true,
  });
  const repo = conn.getRepository(User);

  const aliceHash = await bcrypt.hash('secret123', BCRYPT_COST);
  const bobHash = await bcrypt.hash('BobSecret_123', BCRYPT_COST);

  let alice = await repo.findOne({ where: { username: 'alice' } });
  if (!alice) {
    alice = repo.create({ username: 'alice', password_hash: aliceHash, is_active: true });
    await repo.save(alice);
    console.log('[seed-dev] inserted alice id=' + alice.id);
  } else {
    alice.password_hash = aliceHash;
    alice.is_active = true;
    await repo.save(alice);
    console.log('[seed-dev] updated alice id=' + alice.id);
  }

  let bob = await repo.findOne({ where: { username: 'bob_disabled' } });
  if (!bob) {
    bob = repo.create({ username: 'bob_disabled', password_hash: bobHash, is_active: false });
    await repo.save(bob);
    console.log('[seed-dev] inserted bob_disabled id=' + bob.id);
  } else {
    bob.password_hash = bobHash;
    bob.is_active = false;
    await repo.save(bob);
    console.log('[seed-dev] updated bob_disabled id=' + bob.id);
  }

  const rows = await repo.find({ order: { id: 'ASC' } });
  for (const r of rows) {
    console.log(
      `[seed-dev] user id=${r.id} username=${r.username} is_active=${r.is_active} hash_prefix=${(r.password_hash || '').slice(0, 7)}`,
    );
  }

  const a = await repo.findOne({ where: { username: 'alice' } });
  if (a) {
    const ok = await bcrypt.compare('secret123', a.password_hash as string);
    console.log('[seed-dev] alice/secret123 bcrypt check:', ok);
  }
  const b = await repo.findOne({ where: { username: 'bob_disabled' } });
  if (b) {
    const ok = await bcrypt.compare('BobSecret_123', b.password_hash as string);
    console.log('[seed-dev] bob_disabled/BobSecret_123 bcrypt check:', ok);
  }

  await conn.close();
  console.log('[seed-dev] done');
}

main().catch((err) => {
  console.error('[seed-dev] failed', err);
  process.exit(1);
});
