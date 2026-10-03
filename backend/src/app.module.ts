import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GroupsModule } from './modules/groups/groups.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ModuleModule } from './modules/module/module.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.development'],
    }),
    PrismaModule,
    // Cron sinh công việc từ lịch lặp
    ScheduleModule.forRoot(),
    // --- Danh tính & tổ chức ---
    HealthModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    PermissionsModule,
    ModuleModule,
    ReportsModule,
    // Lưu + phục vụ ảnh đính kèm (ngoài public, qua JwtAuthGuard)
    UploadsModule,
    // --- Nghiệp vụ ---
    ReportsModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  // JwtAuthGuard toàn cục được đăng ký trong AuthModule (nơi có JwtService).
  providers: [AppService],
})
export class AppModule {}
