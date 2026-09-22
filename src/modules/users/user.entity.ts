/**
 * users 实体（与 design.md §数据与状态 + api-contract.md §5.1 对齐）
 *
 * 字段：
 *  - id: 主键
 *  - username: 唯一索引（CREATE UNIQUE INDEX IF NOT EXISTS）
 *  - password_hash: VARCHAR(72) 兼容 future cost
 *  - is_active: BOOLEAN DEFAULT TRUE
 *    // 本期未消费；禁用流程独立 Issue
 *    // (SUG-3 from @Reviewer SUG-3 transferred to BackendDev at S3 dispatch)
 *  - created_at: 现有字段（沿用）
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index('ux_users_username', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: false })
  username!: string;

  @Column({ type: 'varchar', length: 72, name: 'password_hash', nullable: true })
  password_hash!: string | null;

  // 本期未消费；禁用流程独立 Issue
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}