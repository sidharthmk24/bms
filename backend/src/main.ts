/**
 * main.ts — Application entry point.
 *
 * Why UTC first: TypeORM and MySQL both store/read timestamps.
 * Setting TZ='UTC' before anything else ensures JS Date objects,
 * TypeORM, and MySQL are all in the same timezone regardless of
 * the host machine's local setting.
 */

// Must be set before any module is imported so that Date, TypeORM,
// and MySQL all agree on the timezone.
process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security & transport middleware ────────────────────────────────────────
  // helmet sets secure HTTP headers (XSS, clickjacking, etc.)
  app.use((helmet as any).default());
  // compression reduces response size for text payloads
  app.use((compression as any)());
  // cookie-parser allows reading signed cookies (used by refresh-token flow)
  app.use((cookieParser as any)());

  // ── Global API prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // ── Global validation pipe ─────────────────────────────────────────────────
  // whitelist: strip any properties not in the DTO
  // forbidNonWhitelisted: throw 400 if unknown properties are sent
  // transform: auto-convert plain objects to DTO class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global interceptor & filter ────────────────────────────────────────────
  // Every success response is wrapped: { success: true, data: ..., message: ... }
  // Every error response is wrapped:   { success: false, error: { code, message } }
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bookstore Management System API')
    .setDescription(
      'BMS internal staff API. All endpoints require authentication except /auth/login. ' +
      'Role restrictions are annotated on each endpoint.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Authentication & session management')
    .addTag('Health', 'Service health check')
    .addTag('Users', 'User management')
    .addTag('Branches', 'Branch & warehouse management')
    .addTag('Catalog', 'Books, authors, publishers, categories, suppliers')
    .addTag('Inventory', 'Central & branch stock')
    .addTag('Billing', 'Bills and receipts')
    .addTag('Restock', 'Branch restock requests')
    .addTag('Procurement', 'Purchase orders from suppliers')
    .addTag('Exhibitions', 'Travelling exhibition management')
    .addTag('Enquiries', 'Book enquiries & new title requests')
    .addTag('Finance', 'Revenue, expenses, P&L')
    .addTag('Dashboard', 'Role-specific dashboard data')
    .addTag('Audit', 'Audit log')
    .addTag('Settings', 'System settings')
    .addTag('Notifications', 'SSE real-time sync stream')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Mount at /api-docs (outside the /api/v1 global prefix)
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`\n🚀 BMS Backend running on http://localhost:${port}`);
  console.log(`📖 Swagger UI at   http://localhost:${port}/api-docs`);
  console.log(`🏥 Health check at http://localhost:${port}/api/v1/health\n`);
}

bootstrap();
