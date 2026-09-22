/**
 * jwt.token.spec.ts · signJwt / verifyJwt / parseExpiresIn
 */

import * as jwt from 'jsonwebtoken';
import { signJwt, verifyJwt, parseExpiresIn } from '../src/modules/auth/jwt.token';
import { JwtConfig } from '../src/modules/auth/jwt.constants';

const JWT_CFG = new JwtConfig(
  'a-very-long-test-secret-for-unit-tests-only-32+',
  '8h',
  'acme-api',
  'HS256'
);

describe('signJwt', () => {
  test('returns token + ISO8601 expiresAt (UTC, Z suffix)', () => {
    const out = signJwt(42, 'alice', JWT_CFG);
    expect(typeof out.token).toBe('string');
    expect(out.token.split('.').length).toBe(3);
    expect(out.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('token contains sub (string) + username + algorithm HS256', () => {
    const out = signJwt(7, 'bob', JWT_CFG);
    const decoded = jwt.verify(out.token, JWT_CFG.secret) as jwt.JwtPayload;
    expect(decoded.sub).toBe('7');
    expect(decoded.username).toBe('bob');
    expect(decoded.iss).toBe('acme-api');
    // header
    const header = JSON.parse(
      Buffer.from(out.token.split('.')[0], 'base64url').toString()
    );
    expect(header.alg).toBe('HS256');
  });

  test('accepts numeric and string userId', () => {
    const a = signJwt(99, 'a', JWT_CFG);
    const b = signJwt('99', 'a', JWT_CFG);
    expect(jwt.decode(a.token)?.sub).toBe('99');
    expect(jwt.decode(b.token)?.sub).toBe('99');
  });
});

describe('verifyJwt', () => {
  test('verifies valid token', () => {
    const out = signJwt(1, 'alice', JWT_CFG);
    const payload = verifyJwt(out.token, JWT_CFG);
    expect(payload.sub).toBe('1');
    expect(payload.username).toBe('alice');
  });

  test('rejects expired token', () => {
    const expired = jwt.sign(
      {
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 60
      },
      JWT_CFG.secret,
      { algorithm: 'HS256' }
    );
    expect(() => verifyJwt(expired, JWT_CFG)).toThrow();
  });

  test('rejects bad signature', () => {
    const bad = jwt.sign(
      { sub: '1', username: 'alice' },
      'wrong-secret-also-long-enough-32+',
      { algorithm: 'HS256' }
    );
    expect(() => verifyJwt(bad, JWT_CFG)).toThrow();
  });

  test('rejects wrong issuer', () => {
    const bad = jwt.sign(
      { sub: '1', username: 'alice', iss: 'evil' },
      JWT_CFG.secret,
      { algorithm: 'HS256' }
    );
    expect(() => verifyJwt(bad, JWT_CFG)).toThrow();
  });

  test('rejects algorithm mismatch (none)', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        sub: '1',
        username: 'alice',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })
    ).toString('base64url');
    const noneToken = `${header}.${body}.`;
    expect(() => verifyJwt(noneToken, JWT_CFG)).toThrow();
  });
});

describe('parseExpiresIn', () => {
  test('numeric input returned as-is', () => {
    expect(parseExpiresIn(3600)).toBe(3600);
    expect(parseExpiresIn(0)).toBe(0);
  });

  test('seconds (s)', () => {
    expect(parseExpiresIn('60s')).toBe(60);
  });

  test('minutes (m)', () => {
    expect(parseExpiresIn('30m')).toBe(30 * 60);
  });

  test('hours (h)', () => {
    expect(parseExpiresIn('8h')).toBe(8 * 3600);
  });

  test('days (d)', () => {
    expect(parseExpiresIn('1d')).toBe(86400);
  });

  test('invalid format → defaults to 8h', () => {
    expect(parseExpiresIn('xyz')).toBe(8 * 3600);
    expect(parseExpiresIn('')).toBe(8 * 3600);
  });
});