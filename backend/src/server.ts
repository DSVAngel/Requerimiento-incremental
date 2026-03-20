import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createHttpApp() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Accept CORS requests from any origin.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  return app;
}

export async function startHttpServer(portInput?: string | number) {
  const rawPort = portInput ?? process.env.PORT ?? 3000;
  const parsedPort = Number(rawPort);
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

  const app = await createHttpApp();
  await app.listen(port);
  return app;
}
