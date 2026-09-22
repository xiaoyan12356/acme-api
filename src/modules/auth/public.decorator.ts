/**
 * @Public() 装饰器：标记控制器/路由不挂 JwtAuthGuard
 * 与 design.md §建议改动 后端 4 对齐：全局 Guard + @Public 排除
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记路由为公共（不鉴权） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);