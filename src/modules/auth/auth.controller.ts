/**
 * auth.controller.ts
 *
 * POST /api/auth/login（与 api-contract.md §4.1 对齐）
 * 标 @Public()，不挂 JwtAuthGuard
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { validateLoginRequest } from './auth.dto';
import { ValidationHttpException } from './auth.errors';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown): Promise<{ token: string; expiresAt: string }> {
    let input;
    try {
      input = validateLoginRequest(body);
    } catch {
      throw new ValidationHttpException();
    }
    return this.auth.login(input);
  }
}