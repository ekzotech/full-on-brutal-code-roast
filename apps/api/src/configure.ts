import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

export function configure(app: INestApplication) {
  const writes = rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  const limitWrites: RequestHandler = (request, response, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(request.method)) writes(request, response, next);
    else next();
  };
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use('/api', limitWrites);
  app.use(json({ limit: '384kb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableShutdownHooks();
}
