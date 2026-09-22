/**
 * AuthModule：注册 controller + service + JwtConfig provider
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtConfig, loadJwtConfig } from './jwt.constants';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    {
      provide: JwtConfig,
      useFactory: () => loadJwtConfig()
    },
    AuthService
  ],
  exports: [AuthService, JwtConfig]
})
export class AuthModule {}