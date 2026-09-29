import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = Number(config.get('port') ?? config.get('PORT') ?? 3000);
  const apiPrefix = config.get('apiPrefix') ?? config.get('API_PREFIX') ?? 'api';
  const frontendUrl =
    config.get('frontendUrl') ?? config.get('FRONTEND_URL') ?? 'http://localhost:5173';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: [frontendUrl], credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/${apiPrefix}`);
}
await bootstrap();
