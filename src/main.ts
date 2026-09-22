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
  // T3 测试环境补丁：dev/test 跨源（vite :5173 → api :3000）需要 CORS；
  // prod 同源部署不受影响。详见 docs/test/XIAO-57/t3-report.md G2-GAP-CORS-1。
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }
  await app.listen(Number(process.env.PORT) || 3000);
}

if (require.main === module) {
  bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}