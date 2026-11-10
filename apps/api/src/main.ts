import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(3000);
}

void main();
