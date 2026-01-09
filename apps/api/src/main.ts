import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Enable raw body parsing for webhook signature verification
    rawBody: true,
  });

  // Enable CORS for development
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('v1', {
    exclude: ['health', 'shopify/auth', 'shopify/callback', 'webhooks/(.*)'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();
