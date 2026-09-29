import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    // Guard toàn cục phải đăng ký ở module có đủ deps (JwtService, UsersService).
    // Để ở AppModule sẽ lỗi UnknownDependenciesException vì AppModule
    // không thấy JwtService của JwtModule bên trong AuthModule.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
