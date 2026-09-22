/**
 * AppModule：注册 AuthModule + HealthModule + 全局 JwtAuthGuard
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/users/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { JwtConfig } from './modules/auth/jwt.constants';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as 'sqlite') || 'sqlite',
      database: process.env.DB_DATABASE || ':memory:',
      entities: [User],
      synchronize: false,
      autoLoadEntities: true
    }),
    AuthModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: JwtConfig,
      useFactory: () => {
        // 启动 fail-fast：缺 JWT_SECRET / 长度不足 → 进程退出
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be >= 32 bytes');
        }
        return {
          secret,
          expiresIn: process.env.JWT_EXPIRES_IN || '8h',
          issuer: 'acme-api',
          algorithm: 'HS256' as const
        };
      }
    }
  ]
})
export class AppModule {}