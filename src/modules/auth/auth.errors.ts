/**
 * 统一错误响应序列化层（与 api-contract.md §3.5 对齐）
 *
 * 三种 401 响应体字节级一致：
 *  - 字段顺序固定 code 在前 message 在后
 *  - 文案严格表内取，禁止 i18n、禁止加句号、禁止含敏感信息
 *  - additionalProperties=false 禁止额外字段
 *
 * 实现要点：所有 401 错误抛 `AuthHttpException`，由 exception filter
 * 用同一个 serializer 函数序列化，保证 byte-equal。
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AUTH_ERROR_RESPONSES,
  ERROR_CODE,
  AuthErrorKey
} from './auth.constants';

/** 严格禁止额外字段的对象字面量类型 */
export interface AuthErrorBody {
  readonly code: string;
  readonly message: string;
}

/**
 * 序列化函数：保证 byte-equal 输出。
 * - 字段顺序：code → message（ES2015+ 对象字面量保持插入顺序，JSON.stringify 也遵循）
 * - 文案严格取表内（无拼接、无 i18n）
 */
export function serializeAuthError(
  key: AuthErrorKey
): AuthErrorBody {
  return AUTH_ERROR_RESPONSES[key];
}

/** 抛 401 异常的便捷工厂（统一从一处抛出，便于测试与 trace） */
export class AuthHttpException extends HttpException {
  constructor(key: AuthErrorKey) {
    const serialized = serializeAuthError(key);
    // 用 Object.freeze + same reference 保证序列化层不引入额外字段
    super(serialized, HttpStatus.UNAUTHORIZED);
  }
}

/** 400 入参校验失败 */
export class ValidationHttpException extends HttpException {
  constructor() {
    super(
      {
        code: ERROR_CODE.VALIDATION_4001,
        message: 'Invalid request payload'
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

/** 500 内部错误（不泄露内部信息） */
export class InternalHttpException extends HttpException {
  constructor() {
    super(
      {
        code: ERROR_CODE.INTERNAL_5001,
        message: 'Internal server error'
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}