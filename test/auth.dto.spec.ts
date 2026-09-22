/**
 * auth.dto.spec.ts · validateLoginRequest 全部分支
 *
 * 覆盖：缺字段 / 类型错 / 长度超界 / happy path
 */

import { validateLoginRequest } from '../src/modules/auth/auth.dto';

describe('validateLoginRequest', () => {
  test('happy path · 正常账密 → 规范化后 {username, password}', () => {
    expect(
      validateLoginRequest({ username: 'alice', password: 'secret123' })
    ).toEqual({ username: 'alice', password: 'secret123' });
  });

  test('trims username whitespace', () => {
    expect(
      validateLoginRequest({ username: '  alice  ', password: 'secret123' })
    ).toEqual({ username: 'alice', password: 'secret123' });
  });

  test('null body → throws', () => {
    expect(() => validateLoginRequest(null)).toThrow(/object/);
  });

  test('non-object body → throws', () => {
    expect(() => validateLoginRequest('hello')).toThrow(/object/);
    expect(() => validateLoginRequest(42)).toThrow(/object/);
  });

  test('missing username key → throws', () => {
    expect(() => validateLoginRequest({ password: 'secret123' })).toThrow(
      /required/
    );
  });

  test('missing password key → throws', () => {
    expect(() => validateLoginRequest({ username: 'alice' })).toThrow(/required/);
  });

  test('username not a string → throws', () => {
    expect(() =>
      validateLoginRequest({ username: 42, password: 'secret123' })
    ).toThrow(/string/);
  });

  test('password not a string → throws', () => {
    expect(() =>
      validateLoginRequest({ username: 'alice', password: 123 })
    ).toThrow(/string/);
  });

  test('username empty → throws (length 1-64)', () => {
    expect(() => validateLoginRequest({ username: '', password: 'secret123' })).toThrow(
      /username length/
    );
  });

  test('username 64 chars OK', () => {
    expect(
      validateLoginRequest({ username: 'a'.repeat(64), password: 'secret123' })
    ).toEqual({ username: 'a'.repeat(64), password: 'secret123' });
  });

  test('username 65 chars → throws', () => {
    expect(() =>
      validateLoginRequest({ username: 'a'.repeat(65), password: 'secret123' })
    ).toThrow(/username length/);
  });

  test('password 7 chars → throws (length 8-128)', () => {
    expect(() =>
      validateLoginRequest({ username: 'alice', password: '1234567' })
    ).toThrow(/password length/);
  });

  test('password 8 chars OK', () => {
    expect(
      validateLoginRequest({ username: 'alice', password: '12345678' })
    ).toEqual({ username: 'alice', password: '12345678' });
  });

  test('password 128 chars OK', () => {
    expect(
      validateLoginRequest({ username: 'alice', password: 'a'.repeat(128) })
    ).toEqual({ username: 'alice', password: 'a'.repeat(128) });
  });

  test('password 129 chars → throws', () => {
    expect(() =>
      validateLoginRequest({ username: 'alice', password: 'a'.repeat(129) })
    ).toThrow(/password length/);
  });
});