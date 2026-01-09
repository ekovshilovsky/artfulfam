/**
 * Vercel Serverless Function Entry Point
 *
 * This file bootstraps the NestJS application for Vercel's serverless environment.
 * It handles both regular requests and webhook requests that need raw body access.
 */

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { AppModule } from '../src/app.module';

let app: express.Express;

async function bootstrap() {
  if (!app) {
    app = express();

    // Raw body middleware for webhook signature verification
    // Must be before NestJS takes over
    app.use(
      express.json({
        verify: (req: express.Request, _res, buf) => {
          // Store raw body for webhook verification
          (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
        },
      }),
    );

    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(app),
      { logger: ['error', 'warn'] },
    );

    nestApp.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
    });

    nestApp.setGlobalPrefix('v1', {
      exclude: ['health', 'shopify/auth', 'shopify/callback', 'webhooks/(.*)'],
    });

    await nestApp.init();
  }

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await bootstrap();
  expressApp(req as unknown as express.Request, res as unknown as express.Response);
}
