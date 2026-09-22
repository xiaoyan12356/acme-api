/**
 * 幂等迁移：users 表加 password_hash + is_active + 唯一索引
 * 与 design.md §数据与状态 + §迁移策略 对齐
 *  - ADD COLUMN IF NOT EXISTS（PostgreSQL 9.6+ / MySQL 8.0.29+）
 *  - CREATE UNIQUE INDEX IF NOT EXISTS
 *  - 已存在则跳过
 *
 * 本 B' bootstrap 实现为"幂等"（已存在跳过），与真仓 PostgreSQL 行为一致。
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordAndActive1700000000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(72) NULL,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // 不主动 drop 列 / 索引；保留 audit trail
    // 真要回滚：手动 DROP INDEX ux_users_username; ALTER TABLE users DROP COLUMN is_active, DROP COLUMN password_hash;
  }
}