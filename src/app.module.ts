import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateAccountController } from './controllers/create-accounts.controller';

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
  controllers: [CreateAccountController],
  providers: [],
})
export class AppModule {}
