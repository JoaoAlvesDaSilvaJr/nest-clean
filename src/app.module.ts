import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { PrismaModule } from '../prisma/prisma.module';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
