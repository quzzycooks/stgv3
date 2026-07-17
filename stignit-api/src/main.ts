import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });

  // URI versioning: /v1/... — the frontend contract is versioned (PRD requirement).
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown props — defense against payload injection
      forbidNonWhitelisted: true, // reject unexpected fields (OWASP mass-assignment)
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // OpenAPI spec — the contract the frontend builds against. Served at /docs,
  // JSON at /docs-json, so it can be checked into version control / diffed in CI.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stignit API')
    .setDescription('Emergency Response Coordination Platform — internal API (PRD §10)')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'user-jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-sso')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}
void bootstrap();
