import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateAccountController } from './controllers/account/create-accounts.controller';
import { envSchema } from './env';
import { AuthModule } from './auth/auth.module';
import { AuthenticateController } from './controllers/authenticate/authenticate.controller';
import { CreateProductsController } from './controllers/product/create-products.controller';
import { JwtStrategy } from './auth/jwt.strategy';
import { CreateClientController } from './controllers/client/create-clients.controller';
import { CreateOrdersController } from './controllers/order/create-orders.controller';

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
