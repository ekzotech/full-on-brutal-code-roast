import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app';
import { configure } from './configure';
import { port } from './config';

async function main() {
  const app = await NestFactory.create(AppModule);
  configure(app);
  await app.listen(port());
}

void main();
