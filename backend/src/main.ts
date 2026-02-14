import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const corsOrigins = configService.get('CORS_ORIGINS', '').split(',');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port);

  console.log(`
    ╔══════════════════════════════════════════╗
    ║  🏍️  Motorcycle Ride Backend Started    ║
    ║                                          ║
    ║  Environment: ${configService.get('NODE_ENV')}           ║
    ║  Port: ${port}                              ║
    ║  API: http://localhost:${port}/api          ║
    ║  Clerk Mock: ${configService.get('CLERK_MOCK_MODE')}                ║
    ╚══════════════════════════════════════════╝
  `);
}

bootstrap();