import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app';
import { configure } from './configure';
import { port } from './config';

async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  if (process.env.TRUST_PROXY === '1') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  configure(app);
  await app.listen(port());
}

void main();
