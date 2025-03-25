import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateAccountController } from './controllers/create-accounts.controller';
import { envSchema } from './env';
import { AuthModule } from './auth/auth.module';
import { AuthenticateController } from './controllers/authenticate.controller';
import { CreateProductsController } from './controllers/create-products.controller';
import { JwtStrategy } from './auth/jwt.strategy';
import { CreateClientController } from './controllers/create-clients.controller';
import { CreateOrdersController } from './controllers/create-orders.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    CreateAccountController,
    AuthenticateController,
    CreateProductsController,
    CreateClientController,
    CreateOrdersController,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
