/**
 * auth.controller.spec.ts · POST /api/auth/login controller dispatch
 */

import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtConfig } from '../src/modules/auth/jwt.constants';

const JWT_CFG = new JwtConfig(
  'a-very-long-test-secret-for-unit-tests-only-32+',
  '8h',
  'acme-api',
  'HS256'
);

describe('AuthController.login', () => {
  let controller: AuthController;
  let loginMock: jest.Mock;

  beforeEach(async () => {
    loginMock = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: loginMock }
        },
        { provide: JwtConfig, useValue: JWT_CFG }
      ]
    }).compile();
    controller = moduleRef.get(AuthController);
  });

  test('happy path · delegates to service and returns {token, expiresAt}', async () => {
    loginMock.mockResolvedValue({
      token: 'jwt.abc.def',
      expiresAt: '2026-09-22T18:00:00Z'
    });
    const out = await controller.login({
      username: 'alice',
      password: 'secret123'
    });
    expect(out).toEqual({ token: 'jwt.abc.def', expiresAt: '2026-09-22T18:00:00Z' });
    expect(loginMock).toHaveBeenCalledWith({
      username: 'alice',
      password: 'secret123'
    });
  });

  test('invalid body → ValidationHttpException', async () => {
    await expect(controller.login(null as unknown as object)).rejects.toBeInstanceOf(
      HttpException
    );
    await expect(controller.login({ username: 'alice' } as object)).rejects.toBeInstanceOf(
      HttpException
    );
    await expect(
      controller.login({ username: 'a'.repeat(65), password: '12345678' })
    ).rejects.toBeInstanceOf(HttpException);
    expect(loginMock).not.toHaveBeenCalled();
  });

  test('service throws → controller propagates (no wrapping)', async () => {
    loginMock.mockRejectedValue(new Error('db down'));
    await expect(
      controller.login({ username: 'alice', password: 'secret123' })
    ).rejects.toThrow('db down');
  });
});