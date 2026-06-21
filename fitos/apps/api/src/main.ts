import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({ origin: 'http://localhost:8081' });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`FitOS API running on http://localhost:${port}`);
}

void bootstrap();
