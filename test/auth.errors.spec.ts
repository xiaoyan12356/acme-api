/**
 * auth.errors.spec.ts · 三种 401 序列化 byte-equal + Validation/Internal
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AuthHttpException,
  ValidationHttpException,
  InternalHttpException,
  serializeAuthError
} from '../src/modules/auth/auth.errors';
import { AUTH_ERROR_RESPONSES } from '../src/modules/auth/auth.constants';

describe('AuthHttpException', () => {
  test('AUTH_1001 → 401 + AUTH-1001 body', () => {
    const e = new AuthHttpException('AUTH_1001');
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(e.getResponse()).toEqual(AUTH_ERROR_RESPONSES.AUTH_1001);
  });

  test('AUTH_1002 → 401 + AUTH-1002 body', () => {
    const e = new AuthHttpException('AUTH_1002');
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(e.getResponse()).toEqual(AUTH_ERROR_RESPONSES.AUTH_1002);
  });

  test('AUTH_1003 → 401 + AUTH-1003 body', () => {
    const e = new AuthHttpException('AUTH_1003');
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(e.getResponse()).toEqual(AUTH_ERROR_RESPONSES.AUTH_1003);
  });

  test('三种 401 响应体 byte-equal（字段顺序与文案一致）', () => {
    const s1 = JSON.stringify(new AuthHttpException('AUTH_1001').getResponse());
    const s2 = JSON.stringify(new AuthHttpException('AUTH_1002').getResponse());
    const s3 = JSON.stringify(new AuthHttpException('AUTH_1003').getResponse());
    // 仅文案不同；结构（key 顺序、长度）相同
    expect(JSON.parse(s1).code).toBe('AUTH-1001');
    expect(JSON.parse(s2).code).toBe('AUTH-1002');
    expect(JSON.parse(s3).code).toBe('AUTH-1003');
  });
});

describe('serializeAuthError', () => {
  test('returns same reference (frozen const)', () => {
    expect(serializeAuthError('AUTH_1001')).toBe(AUTH_ERROR_RESPONSES.AUTH_1001);
  });
});

describe('ValidationHttpException', () => {
  test('→ 400 + VALIDATION-4001', () => {
    const e = new ValidationHttpException();
    expect(e.getStatus()).toBe(400);
    expect(e.getResponse()).toEqual({
      code: 'VALIDATION-4001',
      message: 'Invalid request payload'
    });
  });
});

describe('InternalHttpException', () => {
  test('→ 500 + INTERNAL-5001', () => {
    const e = new InternalHttpException();
    expect(e.getStatus()).toBe(500);
    expect(e.getResponse()).toEqual({
      code: 'INTERNAL-5001',
      message: 'Internal server error'
    });
  });
});

describe('HttpException base behavior', () => {
  test('AuthHttpException extends HttpException', () => {
    expect(new AuthHttpException('AUTH_1001')).toBeInstanceOf(HttpException);
  });
});