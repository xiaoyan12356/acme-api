/**
 * jwt-auth.guard.spec.ts · UT-AUTH-101 ~ 110 (10 cases)
 *
 * 覆盖 AC-5 / AC-6 / AC-7 + 全局 Guard 挂载 + JWT_SECRET fail-fast + iss 校验
 */

import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { JwtConfig, loadJwtConfig } from '../src/modules/auth/jwt.constants';
import { AUTH_ERROR_RESPONSES } from '../src/modules/auth/auth.constants';
import * as jwt from 'jsonwebtoken';

const JWT_CFG = new JwtConfig(
  'a-very-long-test-secret-for-unit-tests-only-32+',
  '8h',
  'acme-api',
  'HS256'
);

function makeCtx(args: {
  handler?: { getMetadata?: () => unknown };
  cls?: { getMetadata?: () => unknown };
  headers: Record<string, string | undefined>;
}): ExecutionContext {
  const handlers = [];
  const cls = [];
  const http = {
    getRequest: () => ({ headers: args.headers })
  };
  const handler = args.handler ?? {};
  const kclass = args.cls ?? {};
  return {
    getHandler: () => handler,
    getClass: () => kclass,
    switchToHttp: () => http
  } as unknown as ExecutionContext;
}

function makeReflector(publicMap: Record<string, boolean>): Reflector {
  const r = new Reflector();
  jest.spyOn(r, 'getAllAndOverride').mockImplementation(((key: unknown) => {
    if (key === 'isPublic') return publicMap['isPublic'] === true;
    return undefined;
  }) as never);
  return r;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  // UT-AUTH-101 · 无 Authorization 头
  test('UT-AUTH-101 · no Authorization header → 401 + AUTH-1002', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const ctx = makeCtx({ headers: {} });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(401);
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1002
      );
    }
  });

  // UT-AUTH-102 · token 错误
  test('UT-AUTH-102 · bad token → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const ctx = makeCtx({ headers: { authorization: 'Bearer xxx' } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(401);
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });

  // UT-AUTH-103 · token 过期
  test('UT-AUTH-103 · expired token → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const expired = jwt.sign(
      {
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000) - 3600 * 10,
        exp: Math.floor(Date.now() / 1000) - 60,
        iss: 'acme-api'
      },
      JWT_CFG.secret,
      { algorithm: 'HS256' }
    );
    const ctx = makeCtx({ headers: { authorization: `Bearer ${expired}` } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });

  // UT-AUTH-104 · 签名失败
  test('UT-AUTH-104 · signed by different secret → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const otherSecret = 'b'.repeat(40);
    const bad = jwt.sign(
      {
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'acme-api'
      },
      otherSecret,
      { algorithm: 'HS256' }
    );
    const ctx = makeCtx({ headers: { authorization: `Bearer ${bad}` } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });

  // UT-AUTH-105 · none 算法拒绝
  test('UT-AUTH-105 · none-algorithm token → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    // 手工构造 "alg=none" token（无签名）来测试拒绝
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'acme-api'
      })
    ).toString('base64url');
    const noneToken = `${header}.${body}.`;
    const ctx = makeCtx({ headers: { authorization: `Bearer ${noneToken}` } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });

  // UT-AUTH-106 · @Public() 路由不挂 Guard
  test('UT-AUTH-106 · @Public() handler → returns true (no auth check)', () => {
    const r = makeReflector({ isPublic: true });
    const guard = new JwtAuthGuard(r, JWT_CFG);
    const ctx = makeCtx({ headers: {} });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  // UT-AUTH-107 · Authorization 头格式错（无 Bearer）
  test('UT-AUTH-107 · Authorization header without "Bearer " → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const ctx = makeCtx({ headers: { authorization: 'Basic xyz' } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });

  // UT-AUTH-108 · JWT_SECRET 缺失 fail-fast
  test('UT-AUTH-108 · loadJwtConfig with missing secret → throws', () => {
    expect(() => loadJwtConfig({})).toThrow(/JWT_SECRET/);
  });

  // UT-AUTH-109 · JWT_SECRET < 32 字节 fail-fast
  test('UT-AUTH-109 · loadJwtConfig with short secret → throws', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: 'short' })).toThrow(/32 bytes/);
  });

  // UT-AUTH-110 · iss 不匹配
  test('UT-AUTH-110 · token with wrong iss → 401 + AUTH-1003', () => {
    const guard = new JwtAuthGuard(reflector, JWT_CFG);
    const wrongIss = jwt.sign(
      {
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'evil-issuer'
      },
      JWT_CFG.secret,
      { algorithm: 'HS256' }
    );
    const ctx = makeCtx({ headers: { authorization: `Bearer ${wrongIss}` } });

    try {
      guard.canActivate(ctx);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual(
        AUTH_ERROR_RESPONSES.AUTH_1003
      );
    }
  });
});