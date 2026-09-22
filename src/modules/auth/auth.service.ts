/**
 * auth.service.ts
 *
 * 登录核心逻辑（与 design.md §建议改动 后端 3 对齐）：
 *  1. 根据 username 查 user（取 password_hash、is_active）
 *  2. 若 user 不存在 → 用固定假 hash 跑 bcrypt.compare 后，抛 AUTH-1001
 *  3. 若 user 存在但 is_active=false → 同样走假校验后，抛 AUTH-1001
 *  4. bcrypt.compare(password, password_hash) → false 抛 AUTH-1001
 *  5. 校验通过 → 签 JWT
 *  6. 返回 { token, expiresAt }
 *
 * 防枚举双重机制：
 *  - 假 hash 走真 compare 路径（防计时）
 *  - 三种 401 响应体 byte-equal（防响应内容枚举）
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { signJwt } from './jwt.token';
import { JwtConfig } from './jwt.constants';
import { AuthHttpException } from './auth.errors';
import {
  BCRYPT_COST,
  FAKE_PASSWORD_HASH
} from './auth.constants';
import { LoginRequest as LoginInput } from './auth.dto';

export interface LoginResult {
  token: string;
  expiresAt: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtConfig: JwtConfig
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findOne({
      where: { username: input.username }
    });

    if (!user || user.is_active === false || !user.password_hash) {
      // 用固定假 hash 跑一次 bcrypt.compare 防计时
      await bcrypt.compare(input.password, FAKE_PASSWORD_HASH);
      throw new AuthHttpException('AUTH_1001');
    }

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) {
      throw new AuthHttpException('AUTH_1001');
    }

    return signJwt(user.id, user.username, this.jwtConfig);
  }

  /** 暴露给测试 / seed：bcrypt hash 一段密码 */
  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }
}