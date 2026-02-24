import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function setupSwagger(app: Parameters<typeof SwaggerModule.setup>[1], path: string) {
  const config = new DocumentBuilder()
    .setTitle('AIEN Store API')
    .setDescription(
      'REST API for AIEN Store e-commerce platform. Use **Authorize** to add a JWT Bearer token for protected endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token from /auth/login',
        in: 'header',
      },
      'bearer',
    )
    .addTag('auth', 'Registration, login, and password reset')
    .addTag('health', 'Liveness and readiness probes')
    .addTag('products', 'Product catalog')
    .addTag('orders', 'Orders and checkout')
    .addTag('users', 'User management')
    .addTag('categories', 'Product categories')
    .addTag('settings', 'App settings')
    .addTag('media', 'Media upload and registration')
    .addTag('inventory', 'Stock movements')
    .addTag('vouchers', 'Discount vouchers')
    .addTag('dashboard', 'Admin dashboard stats')
    .addTag('favorites', 'User favorites')
    .addTag('profile', 'User profile and shipping')
    .addTag('email-logs', 'Email delivery logs')
    .addTag('jobs', 'Background jobs (pg-boss queues and job list)')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey ? `${controllerKey}_${methodKey}` : controllerKey,
    });

  SwaggerModule.setup(path, app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
    },
    customSiteTitle: 'AIEN Store API Docs',
    jsonDocumentUrl: `${path}-json`,
    yamlDocumentUrl: `${path}-yaml`,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const corsOrigin = configService.get<string>('corsOrigin');
  const swagger = configService.get<{ enabled?: boolean; path?: string }>('swagger');
  const swaggerEnabled = swagger?.enabled ?? false;
  const swaggerPath = swagger?.path ?? 'docs';

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:4321',
    'http://localhost:4322',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4321',
    'http://127.0.0.1:4322',
    'http://127.0.0.1:5173',
  ];
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim())
      : defaultOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  if (swaggerEnabled) {
    setupSwagger(app, swaggerPath);
    console.log(`Swagger docs: http://localhost:${port}/${swaggerPath}`);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
