/**
 * JwtAuthGuard：全局挂载，逐路由默认鉴权
 *
 * 与 design.md §建议改动 后端 4 对齐：
 *  - 受保护接口全部走 JwtAuthGuard
 *  - 公共路由（@Public() 标记）跳过鉴权
 *  - 缺失 Authorization 头 → AUTH-1002
 *  - token 错误 / 过期 / 签名失败 → AUTH-1003
 *
 * 三种 401 响应体字节级一致由 auth.errors.ts 序列化层保证。
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verifyJwt } from './jwt.token';
import { JwtConfig } from './jwt.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthHttpException } from './auth.errors';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtConfig: JwtConfig
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass()
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth || typeof auth !== 'string') {
      throw new AuthHttpException('AUTH_1002');
    }

    const m = /^Bearer\s+(.+)$/.exec(auth);
    if (!m) {
      // 有 Authorization 头但格式错 → 仍走 AUTH-1003（与 token 错误同路径）
      throw new AuthHttpException('AUTH_1003');
    }

    try {
      const payload = verifyJwt(m[1], this.jwtConfig);
      // 把 payload 挂到 req.user，便于下游 controller 取 sub/username
      (req as unknown as { user?: unknown }).user = payload;
      return true;
    } catch {
      // 不区分过期 / 签名失败 / 算法不匹配 → 全部 AUTH-1003
      throw new AuthHttpException('AUTH_1003');
    }
  }
}