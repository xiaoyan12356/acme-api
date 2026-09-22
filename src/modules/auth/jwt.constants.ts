/**
 * JWT 启动校验（fail-fast）
 * 与 design.md §非功能 安全 对齐：JWT_SECRET 缺失或长度不足 32 字节 → 进程退出。
 *
 * JwtConfig 同时作为 NestJS DI 的 class token 使用（必须是 class，不能是 interface）。
 */

import {
  JWT_SECRET_MIN_BYTES,
  JWT_EXPIRES_IN_DEFAULT,
  JWT_ISSUER,
  JWT_ALGORITHM
} from './auth.constants';

export class JwtConfig {
  constructor(
    public readonly secret: string,
    public readonly expiresIn: string,
    public readonly issuer: string,
    public readonly algorithm: typeof JWT_ALGORITHM
  ) {}
}

export function loadJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < JWT_SECRET_MIN_BYTES) {
    throw new Error(
      `JWT_SECRET is required and must be >= ${JWT_SECRET_MIN_BYTES} bytes`
    );
  }
  return new JwtConfig(
    secret,
    env.JWT_EXPIRES_IN || JWT_EXPIRES_IN_DEFAULT,
    JWT_ISSUER,
    JWT_ALGORITHM
  );
}