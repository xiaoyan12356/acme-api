/**
 * POST /api/auth/login 入参 DTO（与 api-contract.md §4.1 对齐）
 *
 * username: 1-64 字符（trim）
 * password: 8-128 字符
 *
 * 不依赖 class-validator（保持实现轻量、显式校验）
 */

import {
  USERNAME_MIN,
  USERNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX
} from './auth.constants';

export interface LoginRequest {
  username: string;
  password: string;
}

/** 校验结果：成功返回规范化后 body；失败抛 ValidationHttpException */
export function validateLoginRequest(
  raw: unknown
): LoginRequest {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('body must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;

  if (!('username' in obj) || !('password' in obj)) {
    throw new Error('username and password are required');
  }
  if (typeof obj.username !== 'string' || typeof obj.password !== 'string') {
    throw new Error('username and password must be strings');
  }

  const username = obj.username.trim();
  const password = obj.password;

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    throw new Error(`username length must be ${USERNAME_MIN}-${USERNAME_MAX}`);
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new Error(`password length must be ${PASSWORD_MIN}-${PASSWORD_MAX}`);
  }

  return { username, password };
}

export interface LoginSuccessResponse {
  token: string;
  expiresAt: string;
}