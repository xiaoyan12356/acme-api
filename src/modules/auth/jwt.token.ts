/**
 * JWT 签发与校验（HS256-only）
 * 与 design.md §非功能 安全 对齐：禁止 'none' 算法；签发 payload 不含敏感字段。
 */

import * as jwt from 'jsonwebtoken';
import { JwtConfig } from './jwt.constants';

export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
  iss: string;
}

export function signJwt(
  userId: number | string,
  username: string,
  config: JwtConfig
): { token: string; expiresAt: string } {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSec = parseExpiresIn(config.expiresIn);
  // iat/exp 由 jsonwebtoken 通过 expiresIn 自动写入；不要重复声明
  const payload = {
    sub: String(userId),
    username,
    iss: config.issuer
  };
  const token = jwt.sign(payload, config.secret, {
    algorithm: config.algorithm,
    expiresIn: config.expiresIn as jwt.SignOptions['expiresIn']
  });
  const exp = now + expiresInSec;
  const expiresAt = new Date(exp * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return { token, expiresAt };
}

export function verifyJwt(token: string, config: JwtConfig): JwtPayload {
  const decoded = jwt.verify(token, config.secret, {
    algorithms: [config.algorithm],
    issuer: config.issuer
  });
  if (typeof decoded === 'string') {
    throw new Error('Unexpected string payload');
  }
  return decoded as JwtPayload;
}

/** 把 '8h' / '30m' / '3600s' 解析为秒数（jsonwebtoken 的 expiresIn 也支持 ms/数字） */
export function parseExpiresIn(v: string | number): number {
  if (typeof v === 'number') return v;
  const m = /^(\d+)([smhd])$/.exec(String(v).trim());
  if (!m) {
    // 不支持的形式：兜底 8h
    return 8 * 3600;
  }
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 8 * 3600;
  }
}