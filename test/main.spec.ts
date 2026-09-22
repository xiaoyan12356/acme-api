/**
 * main.spec.ts · UT-CORS-001 ~ 003 (G2-GAP-CORS-1 修复验证)
 *
 * 覆盖 CORS 配置的三种状态：
 * 1. WEB_ORIGIN 未设置 → Access-Control-Allow-Origin 不出（强制同源）
 * 2. WEB_ORIGIN=单 origin → 回写该 origin + credentials
 * 3. WEB_ORIGIN=多 origin 逗号分隔 → 任意匹配 origin 回写
 *
 * 通过 supertest 打 NestJS app.getHttpServer()，不依赖真实端口。
 */

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { buildCorsOptions } from '../src/cors.config';

const TEST_SECRET = 'a-very-long-test-secret-for-cors-tests-only-32+';

function setBaseEnv(): void {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_EXPIRES_IN = '8h';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_DATABASE = ':memory:';
}

function clearWebOrigin(): void {
  delete process.env.WEB_ORIGIN;
}

async function buildApp(webOrigin: string | null): Promise<INestApplication> {
  setBaseEnv();
  if (webOrigin === null) {
    clearWebOrigin();
  } else {
    process.env.WEB_ORIGIN = webOrigin;
  }

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.enableCors(buildCorsOptions());
  await app.init();
  return app;
}

describe('main.ts CORS (G2-GAP-CORS-1)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    clearWebOrigin();
  });

  // UT-CORS-001 · WEB_ORIGIN 未设 → CORS 关闭（同源安全默认）
  test('UT-CORS-001 · WEB_ORIGIN unset → no Access-Control-Allow-Origin header', async () => {
    app = await buildApp(null);

    const res = await request(app.getHttpServer())
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    // 关键断言：CORS 关闭 → 响应不应有 ACAO 头
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  // UT-CORS-002 · 单 origin 白名单
  test('UT-CORS-002 · WEB_ORIGIN=http://localhost:5173 → ACAO echoes http://localhost:5173 + credentials', async () => {
    app = await buildApp('http://localhost:5173');

    const res = await request(app.getHttpServer())
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173'
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  // UT-CORS-003 · 多 origin 逗号分隔 → 任意匹配 origin 回写
  test('UT-CORS-003 · WEB_ORIGIN=a,b (comma list) → matches each listed origin', async () => {
    app = await buildApp('http://a.example,http://b.example');

    const resA = await request(app.getHttpServer())
      .options('/api/auth/login')
      .set('Origin', 'http://a.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(resA.headers['access-control-allow-origin']).toBe('http://a.example');

    const resB = await request(app.getHttpServer())
      .options('/api/auth/login')
      .set('Origin', 'http://b.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(resB.headers['access-control-allow-origin']).toBe('http://b.example');
  });
});