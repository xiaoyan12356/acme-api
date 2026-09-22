/**
 * XIAO-57 · auth constants
 *
 * 与 design.md v0.1.1 §非功能 安全 + §建议改动 后端 1 对齐：
 *  - bcrypt cost = 12（OWASP 当前推荐折中）
 *  - JWT HS256 单算法
 *  - JWT_SECRET 启动校验 ≥ 32 字节，缺失即 fail-fast
 *  - JWT_EXPIRES_IN 默认 8h（OP-1）
 *  - iss 固定 'acme-api'
 */

export const BCRYPT_COST = 12;
export const JWT_ALGORITHM = 'HS256' as const;
export const JWT_ISSUER = 'acme-api';
export const JWT_EXPIRES_IN_DEFAULT = '8h';
export const JWT_SECRET_MIN_BYTES = 32;
export const USERNAME_MIN = 1;
export const USERNAME_MAX = 64;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/**
 * 固定假 hash：用于"用户不存在 / is_active=false"路径
 * 必须与 BCRYPT_COST=12 输出一致（72 字节）。
 * bcrypt hash format: $2b$<cost>$<22-char-salt><31-char-hash>
 * cost=12 的有效输出长度 60；72 字段保留余量。
 *
 * 用 bcrypt.hashSync('not-a-real-password-for-timing', 12) 在仓库中一次性生成后冻结。
 * 详见 scripts/gen-fake-hash.ts（本地 dev 工具，不入 release）。
 */
// bcrypt.hashSync('not-a-real-password-for-timing', 12) 本地生成
export const FAKE_PASSWORD_HASH =
  '$2b$12$N7dqV9uDT4PfErLhsoTSKOreE1Oxr2NM7RNp95g6zYQgFb5PuhDj2';

/**
 * 错误码常量（与 api-contract.md §3.5 一致）
 * 三种 401 响应体字节级一致；字段顺序固定。
 */
export const ERROR_CODE = {
  AUTH_1001_INVALID_CREDENTIALS: 'AUTH-1001',
  AUTH_1002_MISSING_TOKEN: 'AUTH-1002',
  AUTH_1003_BAD_TOKEN: 'AUTH-1003',
  VALIDATION_4001: 'VALIDATION-4001',
  INTERNAL_5001: 'INTERNAL-5001'
} as const;

/**
 * 三种 401 响应文案（与 api-contract.md §3.5 表对齐）
 * 字段顺序：code 在前，message 在后；序列化层必须保证。
 */
export const AUTH_ERROR_RESPONSES = {
  AUTH_1001: {
    code: ERROR_CODE.AUTH_1001_INVALID_CREDENTIALS,
    message: 'Invalid credentials'
  },
  AUTH_1002: {
    code: ERROR_CODE.AUTH_1002_MISSING_TOKEN,
    message: 'Authentication required'
  },
  AUTH_1003: {
    code: ERROR_CODE.AUTH_1003_BAD_TOKEN,
    message: 'Invalid or expired token'
  }
} as const;

export type AuthErrorKey = keyof typeof AUTH_ERROR_RESPONSES;