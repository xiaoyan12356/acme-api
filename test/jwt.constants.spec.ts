/**
 * jwt.constants.spec.ts · loadJwtConfig happy path + 各种 expiresIn 解析
 */

import { JwtConfig, loadJwtConfig } from '../src/modules/auth/jwt.constants';
import { signJwt } from '../src/modules/auth/jwt.token';

describe('loadJwtConfig', () => {
  test('happy path · returns JwtConfig', () => {
    const cfg = loadJwtConfig({
      JWT_SECRET: 'a'.repeat(40),
      JWT_EXPIRES_IN: '1h'
    });
    expect(cfg.secret).toBe('a'.repeat(40));
    expect(cfg.expiresIn).toBe('1h');
    expect(cfg.issuer).toBe('acme-api');
    expect(cfg.algorithm).toBe('HS256');
    expect(cfg).toBeInstanceOf(JwtConfig);
  });

  test('default expiresIn = 8h', () => {
    const cfg = loadJwtConfig({ JWT_SECRET: 'a'.repeat(40) });
    expect(cfg.expiresIn).toBe('8h');
  });

  test('missing secret → throws', () => {
    expect(() => loadJwtConfig({})).toThrow(/JWT_SECRET/);
  });

  test('empty secret → throws', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  test('short secret → throws', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: 'short' })).toThrow(/32 bytes/);
  });

  test('exactly 32-byte secret OK', () => {
    const cfg = loadJwtConfig({ JWT_SECRET: 'a'.repeat(32) });
    expect(cfg.secret.length).toBe(32);
  });

  test('31-byte secret → throws', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: 'a'.repeat(31) })).toThrow(/32 bytes/);
  });

  test('signJwt with config from loadJwtConfig works', () => {
    const cfg = loadJwtConfig({ JWT_SECRET: 'a'.repeat(40) });
    const out = signJwt(1, 'alice', cfg);
    expect(out.token).toBeDefined();
  });
});