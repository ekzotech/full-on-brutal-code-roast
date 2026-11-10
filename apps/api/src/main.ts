import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app';
import { port } from './config';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(port());
}

void main();
