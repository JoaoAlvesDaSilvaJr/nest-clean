import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);

  Logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  Logger.error('❌ Error starting the application:', error);
});
