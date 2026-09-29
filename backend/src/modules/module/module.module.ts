import { Module as NestModule } from '@nestjs/common';
import { ModuleController } from './module.controller.js';
import { ModuleService } from './module.service.js';

// Alias NestModule vì tên domain "Module" trùng decorator của NestJS
@NestModule({
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],
})
export class ModuleModule {}
