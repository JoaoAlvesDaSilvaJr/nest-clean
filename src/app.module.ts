import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateAccountController } from './controllers/create-accounts.controller';
import { envSchema } from './env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
  ],
  controllers: [CreateAccountController],
  providers: [],
})
export class AppModule {}
