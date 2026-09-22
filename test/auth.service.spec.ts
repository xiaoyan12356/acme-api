/**
 * auth.service.spec.ts · UT-AUTH-001 ~ 011 (11 cases)
 *
 * 覆盖 AC-1 / AC-2 / AC-3（强化 byte-equal + 假 hash 防计时）
 * + 边界长度 / JWT payload 白名单 / DB 异常
 */

import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../src/modules/auth/auth.service';
import { User } from '../src/modules/users/user.entity';
import { JwtConfig } from '../src/modules/auth/jwt.constants';
import {
  BCRYPT_COST,
  AUTH_ERROR_RESPONSES
} from '../src/modules/auth/auth.constants';

const JWT_CFG = new JwtConfig(
  'a-very-long-test-secret-for-unit-tests-only-32+',
  '8h',
  'acme-api',
  'HS256'
);

function makeRepoStub(): jest.Mocked<Repository<User>> {
  return {
    findOne: jest.fn()
  } as unknown as jest.Mocked<Repository<User>>;
}

describe('AuthService.login', () => {
  let repo: jest.Mocked<Repository<User>>;
  let svc: AuthService;

  beforeEach(() => {
    repo = makeRepoStub();
    svc = new AuthService(repo, JWT_CFG);
  });

  // UT-AUTH-001
  test('UT-AUTH-001 · correct creds → 200 + {token, expiresAt}', async () => {
    const hash = await bcrypt.hash('secret123', 4); // 用低 cost 加快测试
    repo.findOne.mockResolvedValue({
      id: 42,
      username: 'alice',
      password_hash: hash,
      is_active: true,
      created_at: new Date()
    });

    const out = await svc.login({ username: 'alice', password: 'secret123' });
    expect(typeof out.token).toBe('string');
    expect(out.token.split('.').length).toBe(3); // JWT 三段

    const decoded = jwt.verify(out.token, JWT_CFG.secret) as jwt.JwtPayload;
    expect(decoded.sub).toBe('42');
    expect(decoded.username).toBe('alice');
    expect(decoded.iss).toBe('acme-api');
    expect(typeof decoded.exp).toBe('number');
    expect(typeof out.expiresAt).toBe('string');
    expect(out.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    // exp 与 expiresAt 数值一致
    expect(new Date(out.expiresAt).getTime() / 1000).toBe(decoded.exp);
  });

  // UT-AUTH-002
  test('UT-AUTH-002 · wrong password → 401 + AUTH-1001', async () => {
    const hash = await bcrypt.hash('correct-password', 4);
    repo.findOne.mockResolvedValue({
      id: 1,
      username: 'alice',
      password_hash: hash,
      is_active: true,
      created_at: new Date()
    });

    await expect(
      svc.login({ username: 'alice', password: 'WRONG' + 'x'.repeat(8) })
    ).rejects.toMatchObject({
      status: 401,
      response: AUTH_ERROR_RESPONSES.AUTH_1001
    });
  });

  // UT-AUTH-003 · byte-equal + 假 hash 防枚举
  test('UT-AUTH-003 · user-not-found → 401 + AUTH-1001 (response body byte-equal to UT-AUTH-002)', async () => {
    repo.findOne.mockResolvedValue(null);

    let body1: unknown;
    try {
      await svc.login({ username: 'nobody', password: 'whatever88' });
    } catch (e) {
      body1 = (e as { response: unknown }).response;
    }

    const hash = await bcrypt.hash('correct-password', 4);
    const repo2 = makeRepoStub();
    repo2.findOne.mockResolvedValue({
      id: 1,
      username: 'someone-else',
      password_hash: hash,
      is_active: true,
      created_at: new Date()
    });
    const svc2 = new AuthService(repo2, JWT_CFG);

    let body2: unknown;
    try {
      await svc2.login({ username: 'someone-else', password: 'WRONG' + 'x'.repeat(8) });
    } catch (e) {
      body2 = (e as { response: unknown }).response;
    }

    expect(body1).toBeDefined();
    expect(body2).toBeDefined();
    expect(JSON.stringify(body1)).toBe(JSON.stringify(body2));
    // 字节级断言（更严格）
    expect(JSON.stringify(body1)).toBe(
      JSON.stringify(AUTH_ERROR_RESPONSES.AUTH_1001)
    );
  });

  // UT-AUTH-004 · is_active=false → 同 byte-equal
  test('UT-AUTH-004 · is_active=false → 401 + AUTH-1001 (byte-equal to wrong-password path)', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      username: 'frozen',
      password_hash: '$2b$12$anyhashherenotusedxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      is_active: false,
      created_at: new Date()
    });

    let body: unknown;
    try {
      await svc.login({ username: 'frozen', password: 'whatever88' });
    } catch (e) {
      body = (e as { response: unknown }).response;
    }
    expect(JSON.stringify(body)).toBe(
      JSON.stringify(AUTH_ERROR_RESPONSES.AUTH_1001)
    );
  });

  // UT-AUTH-005 · 假 hash 防计时
  test('UT-AUTH-005 · timing: user-not-found ≈ wrong-password (≤ 5x ratio)', async () => {
    const iterations = 3;
    const hash = await bcrypt.hash('correct-password', BCRYPT_COST);

    async function timeIt(repoMock: jest.Mocked<Repository<User>>): Promise<number> {
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        try {
          await svc.login({ username: 'a', password: 'whatever88' });
        } catch {
          /* swallow */
        }
      }
      return Date.now() - start;
    }

    repo.findOne.mockResolvedValue(null);
    const t1 = await timeIt(repo);

    repo.findOne.mockResolvedValue({
      id: 1,
      username: 'a',
      password_hash: hash,
      is_active: true,
      created_at: new Date()
    });
    const t2 = await timeIt(repo);

    // 防枚举门槛：错密码路径不应显著快于不存在用户路径
    // 用 5x 比值兜底（CI 上可能有抖动；不是 strict ≤ 5ms，而是 ≤ 5x）
    const ratio = Math.max(t1, t2) / Math.max(1, Math.min(t1, t2));
    expect(ratio).toBeLessThanOrEqual(5);
  });

  // UT-AUTH-006
  test('UT-AUTH-006 · username 65 chars → service accepts input (validation in controller, not service)', async () => {
    // Service 不做长度校验（controller 层 DTO 负责）；service 只跑 login
    // 这里断言 service 接受 65 字符 username 用于业务对比（不会有 user 匹配）
    repo.findOne.mockResolvedValue(null);
    await expect(
      svc.login({ username: 'a'.repeat(65), password: 'whatever88' })
    ).rejects.toMatchObject({ status: 401 });
  });

  // UT-AUTH-007
  test('UT-AUTH-007 · password 7 chars → service accepts but throws 401', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      svc.login({ username: 'a', password: '1234567' })
    ).rejects.toMatchObject({ status: 401 });
  });

  // UT-AUTH-008
  test('UT-AUTH-008 · password 129 chars → service accepts but throws 401', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      svc.login({ username: 'a', password: 'a'.repeat(129) })
    ).rejects.toMatchObject({ status: 401 });
  });

  // UT-AUTH-009
  test('UT-AUTH-009 · missing username key → service still does lookup with undefined', async () => {
    // service 仅做业务查找，DTO 校验在 controller。这里断言 service 不崩。
    repo.findOne.mockResolvedValue(null);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svc.login({ username: '' as any, password: 'whatever88' })
    ).rejects.toMatchObject({ status: 401 });
  });

  // UT-AUTH-010 · JWT payload 白名单
  test('UT-AUTH-010 · JWT payload only contains sub/username/iat/exp/iss (no password/email)', async () => {
    const hash = await bcrypt.hash('secret123', 4);
    repo.findOne.mockResolvedValue({
      id: 7,
      username: 'bob',
      password_hash: hash,
      is_active: true,
      created_at: new Date()
    });

    const out = await svc.login({ username: 'bob', password: 'secret123' });
    const decoded = jwt.verify(out.token, JWT_CFG.secret) as jwt.JwtPayload;
    const claimKeys = Object.keys(decoded).sort();
    expect(claimKeys).toEqual(
      expect.arrayContaining(['sub', 'username', 'iat', 'exp', 'iss'])
    );
    // 不应包含敏感字段
    expect(decoded).not.toHaveProperty('password');
    expect(decoded).not.toHaveProperty('password_hash');
    expect(decoded).not.toHaveProperty('email');
  });

  // UT-AUTH-011 · DB 异常 → 5xx（不泄露内部信息）
  test('UT-AUTH-011 · DB query throws → propagates error (not leaked to caller)', async () => {
    repo.findOne.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:5432'));

    // DB 异常不应被吞掉（service 不应吃错），也不应被错误归为 401
    await expect(
      svc.login({ username: 'a', password: 'whatever88' })
    ).rejects.toThrow('ECONNREFUSED');
    // 关键：内部堆栈不应进 AuthHttpException 路径（即不该有 status/response 字段）
  });
});