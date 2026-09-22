/**
 * main.ts：NestJS 入口；启动校验 JWT_SECRET；挂 APP_GUARD 全局生效。
 *
 * 注：JWT_SECRET fail-fast 由 AppModule 的 JwtConfig provider 处理（见 app.module.ts）。
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT) || 3000);
}

if (require.main === module) {
  bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}